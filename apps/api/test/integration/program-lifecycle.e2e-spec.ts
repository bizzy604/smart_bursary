/**
 * Purpose: Validate county-admin program lifecycle endpoints end-to-end.
 * Why important: Confirms creation, update, publish, and close workflows for bursary programs.
 * Used by: Phase 1 validation checklist and regression testing.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Program Lifecycle (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let countyAdminToken = '';
	let otherCountyAdminToken = '';
	let studentToken = '';
	let programId = '';
	let wardId = '';

	const primaryCountySlug = 'phase1-turkana';
	const secondaryCountySlug = 'phase1-nairobi';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);

		const primaryCounty = await prisma.county.upsert({
			where: { slug: primaryCountySlug },
			update: {},
			create: {
				slug: primaryCountySlug,
				name: 'Phase 1 Turkana County',
				fundName: 'Phase 1 Fund',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});

		const secondaryCounty = await prisma.county.upsert({
			where: { slug: secondaryCountySlug },
			update: {},
			create: {
				slug: secondaryCountySlug,
				name: 'Phase 1 Nairobi County',
				fundName: 'Phase 1 Nairobi Fund',
				planTier: 'ENTERPRISE',
				isActive: true,
			},
		});

		const ward = await prisma.ward.create({
			data: {
				countyId: primaryCounty.id,
				name: `Phase 1 Ward ${Date.now()}`,
				code: `P1-${Date.now()}`,
			},
		});
		wardId = ward.id;

		const countyAdminPassword = 'AdminPass123!';
		const otherCountyAdminPassword = 'OtherAdminPass123!';

		await prisma.user.create({
			data: {
				countyId: primaryCounty.id,
				email: `phase1.admin.${Date.now()}@example.com`,
				phone: '+254700000100',
				passwordHash: await hash(countyAdminPassword, 10),
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		await prisma.user.create({
			data: {
				countyId: secondaryCounty.id,
				email: `phase1.admin.other.${Date.now()}@example.com`,
				phone: '+254700000200',
				passwordHash: await hash(otherCountyAdminPassword, 10),
				role: UserRole.COUNTY_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		const studentEmail = `phase1.student.${Date.now()}@example.com`;
		const studentPassword = 'StrongPass123!';
		await request(app.getHttpServer())
			.post('/api/v1/auth/register')
			.send({
				email: studentEmail,
				password: studentPassword,
				countySlug: primaryCountySlug,
				fullName: 'Phase One Student',
				phone: '+254700000300',
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

		const otherCountyAdminLogin = await request(app.getHttpServer())
			.post('/api/v1/auth/login')
			.send({
				email: (await prisma.user.findFirstOrThrow({
					where: { countyId: secondaryCounty.id, role: UserRole.COUNTY_ADMIN },
					select: { email: true },
				})).email,
				password: otherCountyAdminPassword,
				countySlug: secondaryCountySlug,
			})
			.expect(201);
		otherCountyAdminToken = otherCountyAdminLogin.body.accessToken;

		const studentLogin = await request(app.getHttpServer())
			.post('/api/v1/auth/login')
			.send({
				email: studentEmail,
				password: studentPassword,
				countySlug: primaryCountySlug,
			})
			.expect(201);
		studentToken = studentLogin.body.accessToken;
	});

	afterAll(async () => {
		await app.close();
	});

	it('county admin creates a draft program', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/programs')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.send({
				name: 'Phase 1 Program',
				description: 'Program lifecycle test',
				wardId,
				budgetCeiling: 4500000,
				opensAt: '2026-05-01T00:00:00.000Z',
				closesAt: '2026-06-30T23:59:59.000Z',
				academicYear: '2026',
				eligibilityRules: [
					{ ruleType: 'EDUCATION_LEVEL', parameters: { allowed: ['UNIVERSITY'] } },
					{ ruleType: 'INCOME_BRACKET', parameters: { max_annual_income_kes: 650000 } },
				],
			})
			.expect(201);

		expect(response.body.id).toBeDefined();
		expect(response.body.status).toBe('DRAFT');
		expect(response.body.eligibilityRules).toHaveLength(2);
		programId = response.body.id;
	});

	it('student cannot create programs', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/programs')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({
				name: 'Forbidden Program',
				budgetCeiling: 1000000,
				opensAt: '2026-05-01T00:00:00.000Z',
				closesAt: '2026-06-30T23:59:59.000Z',
			})
			.expect(403);
	});

	it('county admin updates a draft program', async () => {
		const response = await request(app.getHttpServer())
			.patch(`/api/v1/programs/${programId}`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.send({
				name: 'Phase 1 Program Updated',
				budgetCeiling: 5000000,
				eligibilityRules: [
					{ ruleType: 'EDUCATION_LEVEL', parameters: { allowed: ['UNIVERSITY', 'COLLEGE_TVET'] } },
				],
			})
			.expect(200);

		expect(response.body.name).toBe('Phase 1 Program Updated');
		expect(Number(response.body.budgetCeiling)).toBe(5000000);
		expect(response.body.eligibilityRules).toHaveLength(1);
	});

	it('county admin publishes a draft program', async () => {
		const response = await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/publish`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(201);

		expect(response.body.id).toBe(programId);
		expect(response.body.status).toBe('ACTIVE');
	});

	it('cannot update an active program', async () => {
		await request(app.getHttpServer())
			.patch(`/api/v1/programs/${programId}`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.send({ name: 'Should Fail' })
			.expect(400);
	});

	it('other county admin cannot close a program outside their county', async () => {
		await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/close`)
			.set('Authorization', `Bearer ${otherCountyAdminToken}`)
			.expect(404);
	});

	it('county admin closes an active program', async () => {
		const response = await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/close`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(201);

		expect(response.body.id).toBe(programId);
		expect(response.body.status).toBe('CLOSED');
		expect(response.body.closesAt).toBeDefined();
	});

	it('program listing supports status filtering', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/programs?status=CLOSED')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(200);

		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body.some((program: { id: string }) => program.id === programId)).toBe(true);
	});

	it('county admin archives a closed program (excluded from default listing)', async () => {
		const response = await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/archive`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(201);

		expect(response.body.id).toBe(programId);
		expect(response.body.status).toBe('ARCHIVED');

		const defaultList = await request(app.getHttpServer())
			.get('/api/v1/programs')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(200);
		expect(defaultList.body.some((p: { id: string }) => p.id === programId)).toBe(false);

		const archivedList = await request(app.getHttpServer())
			.get('/api/v1/programs?status=ARCHIVED')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(200);
		expect(archivedList.body.some((p: { id: string }) => p.id === programId)).toBe(true);
	});

	it('county admin unarchives a program back to DRAFT', async () => {
		const response = await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/unarchive`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(201);

		expect(response.body.id).toBe(programId);
		expect(response.body.status).toBe('DRAFT');
	});

	it('rejects unarchive when program is not archived', async () => {
		await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/unarchive`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(400);
	});

	it('students cannot archive or delete programs', async () => {
		await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/archive`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(403);

		await request(app.getHttpServer())
			.delete(`/api/v1/programs/${programId}`)
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(403);
	});

	it('cross-tenant admin cannot delete a program', async () => {
		await request(app.getHttpServer())
			.delete(`/api/v1/programs/${programId}`)
			.set('Authorization', `Bearer ${otherCountyAdminToken}`)
			.expect(404);
	});

	it('county admin soft-deletes a program (removed from all listings)', async () => {
		const response = await request(app.getHttpServer())
			.delete(`/api/v1/programs/${programId}`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(200);

		expect(response.body.deleted).toBe(true);
		expect(response.body.id).toBe(programId);

		await request(app.getHttpServer())
			.get(`/api/v1/programs/${programId}`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(404);

		const allStatuses = ['DRAFT', 'ACTIVE', 'CLOSED', 'SUSPENDED', 'ARCHIVED'];
		for (const status of allStatuses) {
			const list = await request(app.getHttpServer())
				.get(`/api/v1/programs?status=${status}`)
				.set('Authorization', `Bearer ${countyAdminToken}`)
				.expect(200);
			expect(list.body.some((p: { id: string }) => p.id === programId)).toBe(false);
		}
	});

	it('cannot archive a soft-deleted program', async () => {
		await request(app.getHttpServer())
			.post(`/api/v1/programs/${programId}/archive`)
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.expect(404);
	});
});
