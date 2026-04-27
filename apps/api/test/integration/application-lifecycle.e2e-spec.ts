/**
 * Purpose: Validate student application lifecycle endpoints (withdraw + delete-draft) end-to-end.
 * Why important: Confirms students can cancel submitted applications and remove drafts with correct guards.
 * Used by: Phase 2B regression for the Applications module.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { ApplicationStatus, UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Application Lifecycle (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let countyAdminToken = '';
	let studentToken = '';
	let otherStudentToken = '';
	let countyId = '';
	let wardId = '';
	let studentUserId = '';

	const primaryCountySlug = `phase2b-app-turkana-${Date.now()}`;
	const secondaryCountySlug = `phase2b-app-other-${Date.now()}`;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
		await app.init();

		prisma = moduleFixture.get(PrismaService);

		const primaryCounty = await prisma.county.create({
			data: {
				slug: primaryCountySlug,
				name: 'Phase 2B Apps Turkana',
				fundName: 'Phase 2B Apps Fund',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});
		countyId = primaryCounty.id;

		const secondaryCounty = await prisma.county.create({
			data: {
				slug: secondaryCountySlug,
				name: 'Phase 2B Apps Other',
				fundName: 'Phase 2B Apps Other Fund',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});

		const wardSuffix = Date.now().toString().slice(-8);
		const ward = await prisma.ward.create({
			data: {
				countyId: primaryCounty.id,
				name: `Phase 2B Apps Ward ${wardSuffix}`,
				code: `A${wardSuffix}`,
			},
		});
		wardId = ward.id;

		await prisma.ward.create({
			data: {
				countyId: secondaryCounty.id,
				name: `Phase 2B Apps Other Ward ${wardSuffix}`,
				code: `B${wardSuffix}`,
			},
		});

		const countyAdminPassword = 'AdminPass123!';
		await prisma.user.create({
			data: {
				countyId: primaryCounty.id,
				email: `phase2b.apps.admin.${Date.now()}@example.com`,
				phone: '+254700020100',
				passwordHash: await hash(countyAdminPassword, 10),
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		const studentEmail = `phase2b.apps.student.${Date.now()}@example.com`;
		const studentPassword = 'StrongPass123!';
		await request(app.getHttpServer())
			.post('/api/v1/auth/register')
			.send({
				email: studentEmail,
				password: studentPassword,
				countySlug: primaryCountySlug,
				fullName: 'Phase 2B Apps Student',
				phone: '+254700020300',
			})
			.expect(201);

		const otherStudentEmail = `phase2b.apps.other.student.${Date.now()}@example.com`;
		const otherStudentPassword = 'StrongPass456!';
		await request(app.getHttpServer())
			.post('/api/v1/auth/register')
			.send({
				email: otherStudentEmail,
				password: otherStudentPassword,
				countySlug: secondaryCountySlug,
				fullName: 'Phase 2B Other Student',
				phone: '+254700020400',
			})
			.expect(201);

		const countyAdminLogin = await request(app.getHttpServer())
			.post('/api/v1/auth/login')
			.send({
				email: (await prisma.user.findFirstOrThrow({
					where: { countyId: primaryCounty.id, role: UserRole.COUNTY_ADMIN },
					select: { email: true },
				})).email,
				password: countyAdminPassword,
				countySlug: primaryCountySlug,
			})
			.expect(201);
		countyAdminToken = countyAdminLogin.body.accessToken;

		const studentLogin = await request(app.getHttpServer())
			.post('/api/v1/auth/login')
			.send({ email: studentEmail, password: studentPassword, countySlug: primaryCountySlug })
			.expect(201);
		studentToken = studentLogin.body.accessToken;
		studentUserId = (await prisma.user.findFirstOrThrow({
			where: { email: studentEmail, countyId: primaryCounty.id },
			select: { id: true },
		})).id;

		const otherStudentLogin = await request(app.getHttpServer())
			.post('/api/v1/auth/login')
			.send({
				email: otherStudentEmail,
				password: otherStudentPassword,
				countySlug: secondaryCountySlug,
			})
			.expect(201);
		otherStudentToken = otherStudentLogin.body.accessToken;
	});

	afterAll(async () => {
		await app.close();
	});

	let draftSeq = 0;

	async function createDraftDirect(
		applicantId: string,
		ownerCountyId: string,
		ownerWardId: string,
	) {
		// Use a fresh program per draft because (applicant_id, program_id) is unique.
		draftSeq += 1;
		const program = await prisma.bursaryProgram.create({
			data: {
				countyId: ownerCountyId,
				wardId: ownerWardId,
				name: `Phase 2B Apps Draft Program ${draftSeq}`,
				academicYear: '2026',
				budgetCeiling: 1_000_000,
				opensAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
				closesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				status: 'ACTIVE',
				createdBy: applicantId,
			},
			select: { id: true },
		});
		return prisma.application.create({
			data: {
				countyId: ownerCountyId,
				applicantId,
				programId: program.id,
				wardId: ownerWardId,
				status: ApplicationStatus.DRAFT,
			},
			select: { id: true, status: true },
		});
	}

	async function setStatus(applicationId: string, status: ApplicationStatus) {
		await prisma.application.update({
			where: { id: applicationId },
			data: { status, submittedAt: status === ApplicationStatus.DRAFT ? null : new Date() },
		});
	}

	it('student withdraws a SUBMITTED application', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		await setStatus(draft.id, ApplicationStatus.SUBMITTED);

		const response = await request(app.getHttpServer())
			.post(`/api/v1/applications/${draft.id}/withdraw`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		expect(response.body.id).toBe(draft.id);
		expect(response.body.status).toBe('WITHDRAWN');

		const persisted = await prisma.application.findUniqueOrThrow({
			where: { id: draft.id },
			select: { status: true },
		});
		expect(persisted.status).toBe('WITHDRAWN');

		const timeline = await prisma.applicationTimeline.findMany({
			where: { applicationId: draft.id, eventType: 'APPLICATION_WITHDRAWN' },
		});
		expect(timeline).toHaveLength(1);
	});

	it('student cannot withdraw a DRAFT application', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		const response = await request(app.getHttpServer())
			.post(`/api/v1/applications/${draft.id}/withdraw`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(400);
		expect(String(response.body.error?.message ?? '')).toMatch(/Drafts cannot be withdrawn/i);
	});

	it('student cannot withdraw an APPROVED application', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		await setStatus(draft.id, ApplicationStatus.APPROVED);

		await request(app.getHttpServer())
			.post(`/api/v1/applications/${draft.id}/withdraw`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(400);
	});

	it('cannot withdraw the same application twice', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		await setStatus(draft.id, ApplicationStatus.SUBMITTED);

		await request(app.getHttpServer())
			.post(`/api/v1/applications/${draft.id}/withdraw`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		await request(app.getHttpServer())
			.post(`/api/v1/applications/${draft.id}/withdraw`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(400);
	});

	it('cross-tenant withdraw returns 404', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		await setStatus(draft.id, ApplicationStatus.SUBMITTED);

		await request(app.getHttpServer())
			.post(`/api/v1/applications/${draft.id}/withdraw`)
			.set('Authorization', `Bearer ${otherStudentToken}`)
			.expect(404);
	});

	it('non-student cannot withdraw an application', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		await setStatus(draft.id, ApplicationStatus.SUBMITTED);

		await request(app.getHttpServer())
			.post(`/api/v1/applications/${draft.id}/withdraw`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(403);
	});

	it('student soft-deletes a DRAFT application (hidden from my-applications)', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);

		const response = await request(app.getHttpServer())
			.delete(`/api/v1/applications/${draft.id}/draft`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		expect(response.body.id).toBe(draft.id);
		expect(response.body.deleted).toBe(true);

		const list = await request(app.getHttpServer())
			.get('/api/v1/applications/my-applications')
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);
		expect(list.body.some((row: { id: string }) => row.id === draft.id)).toBe(false);

		const persisted = await prisma.application.findUniqueOrThrow({
			where: { id: draft.id },
			select: { deletedAt: true },
		});
		expect(persisted.deletedAt).not.toBeNull();
	});

	it('student cannot delete a SUBMITTED application via delete-draft', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		await setStatus(draft.id, ApplicationStatus.SUBMITTED);

		const response = await request(app.getHttpServer())
			.delete(`/api/v1/applications/${draft.id}/draft`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(400);
		expect(String(response.body.error?.message ?? '')).toMatch(/Only draft applications/i);
	});

	it('cross-tenant delete-draft returns 404', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);

		await request(app.getHttpServer())
			.delete(`/api/v1/applications/${draft.id}/draft`)
			.set('Authorization', `Bearer ${otherStudentToken}`)
			.expect(404);
	});

	it('non-student cannot delete a draft application', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);

		await request(app.getHttpServer())
			.delete(`/api/v1/applications/${draft.id}/draft`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(403);
	});

	it('cannot delete an already deleted draft', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);

		await request(app.getHttpServer())
			.delete(`/api/v1/applications/${draft.id}/draft`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		await request(app.getHttpServer())
			.delete(`/api/v1/applications/${draft.id}/draft`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(404);
	});

	it('soft-deleted drafts are excluded from getApplication', async () => {
		const draft = await createDraftDirect(studentUserId, countyId, wardId);
		await request(app.getHttpServer())
			.delete(`/api/v1/applications/${draft.id}/draft`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);

		await request(app.getHttpServer())
			.get(`/api/v1/applications/${draft.id}`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(404);
	});

});
