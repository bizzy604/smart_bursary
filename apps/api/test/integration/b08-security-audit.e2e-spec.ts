/**
 * Purpose: Validate B-08 isolation, RBAC, ward scope, and workflow audit invariants.
 * Why important: Closes remaining security and audit functional gaps before release hardening.
 * Used by: B-08 completion gate for TM-01, AU-04, AU-05, AI-06, RW-01, and RW-05.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { signToken } from './disbursement-execution.helpers';
import { createActiveProgram, ensureCountyAndWard, markStudentSubmissionReady, registerStudentAndLogin } from './student-application.helpers';

const serviceKey = 'b08-internal-service-key';

describe('B-08 security and audit closure (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let countyId = '';
	let countySlug = 'turkana';
	let wardId = '';
	let wardTwoId = '';
	let financeToken = '';
	let financeOtherCountyToken = '';
	let wardToken = '';
	let wardOtherToken = '';
	let applicationId = '';

	beforeAll(async () => {
		process.env.INTERNAL_SERVICE_KEY = serviceKey;
		const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();
		prisma = moduleFixture.get(PrismaService);
		const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });
		const primary = await ensureCountyAndWard(prisma, countySlug);
		countyId = primary.countyId;
		wardId = primary.wardId;
		const wardTwo = await prisma.ward.create({
			data: { countyId, name: `B08 Ward ${Date.now()}`, code: `B08-${Date.now()}` },
		});
		wardTwoId = wardTwo.id;

		const secondary = await ensureCountyAndWard(prisma, `b08-county-${Date.now()}`);
		const finance = await prisma.user.create({
			data: {
				countyId,
				email: `b08-finance-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.FINANCE_OFFICER,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		const wardAdmin = await prisma.user.create({
			data: {
				countyId,
				wardId,
				email: `b08-ward-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.WARD_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		const wardOther = await prisma.user.create({
			data: {
				countyId,
				wardId: wardTwoId,
				email: `b08-ward-other-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.WARD_ADMIN,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		const financeOtherCounty = await prisma.user.create({
			data: {
				countyId: secondary.countyId,
				email: `b08-finance-other-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.FINANCE_OFFICER,
				emailVerified: true,
				phoneVerified: true,
			},
		});

		financeToken = signToken(jwtService, finance);
		financeOtherCountyToken = signToken(jwtService, financeOtherCounty);
		wardToken = signToken(jwtService, wardAdmin);
		wardOtherToken = signToken(jwtService, wardOther);

		const studentEmail = `b08-student-${Date.now()}@example.com`;
		const studentToken = await registerStudentAndLogin(app, studentEmail, 'Password123!', countySlug);
		await markStudentSubmissionReady(prisma, countyId, studentEmail);
		const program = await createActiveProgram(prisma, countyId, wardId, `B08 Program ${Date.now()}`);
		const draft = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ programId: program.id })
			.expect(201);
		applicationId = draft.body.id as string;
		await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ applicationId })
			.expect(201);
		await ingestScore(app, applicationId, countyId, 82.25);
		await request(app.getHttpServer())
			.post(`/api/v1/applications/${applicationId}/review/ward`)
			.set('Authorization', `Bearer ${wardToken}`)
			.send({ decision: 'RECOMMENDED', recommendedAmount: 32000, note: 'Ward note for audit trail' })
			.expect(200);
		await request(app.getHttpServer())
			.post(`/api/v1/applications/${applicationId}/review/county`)
			.set('Authorization', `Bearer ${financeToken}`)
			.send({ decision: 'APPROVED', allocatedAmount: 30000, note: 'County note for audit trail' })
			.expect(200);
	});

	afterAll(async () => {
		await app.close();
	});

	it('enforces explicit RBAC on student routes and county-wide reports', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${wardToken}`)
			.send({ programId: '00000000-0000-0000-0000-000000000000' })
			.expect(403);
		await request(app.getHttpServer())
			.get('/api/v1/documents/00000000-0000-0000-0000-000000000000')
			.set('Authorization', `Bearer ${financeToken}`)
			.expect(403);
		await request(app.getHttpServer())
			.get('/api/v1/reports/dashboard')
			.set('Authorization', `Bearer ${wardToken}`)
			.expect(403);
	});

	it('returns timeline and review notes with ward and county isolation', async () => {
		const timeline = await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}/timeline`)
			.set('Authorization', `Bearer ${financeToken}`)
			.expect(200);
		expect(timeline.body.data.map((row: { eventType: string }) => row.eventType)).toEqual(
			expect.arrayContaining(['APPLICATION_SUBMITTED', 'AI_SCORED', 'WARD_REVIEW_RECOMMENDED', 'COUNTY_REVIEW_APPROVED']),
		);
		await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}/timeline`)
			.set('Authorization', `Bearer ${wardOtherToken}`)
			.expect(403);
		await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}/timeline`)
			.set('Authorization', `Bearer ${financeOtherCountyToken}`)
			.expect(404);
		const notes = await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}/review-notes`)
			.set('Authorization', `Bearer ${financeToken}`)
			.expect(200);
		expect(notes.body.data.map((row: { stage: string }) => row.stage)).toEqual(['WARD_REVIEW', 'COUNTY_REVIEW']);
		await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}/review-notes`)
			.set('Authorization', `Bearer ${financeOtherCountyToken}`)
			.expect(404);
	});

	it('keeps AI scoring transitions non-terminal', async () => {
		const email = `b08-ai-${Date.now()}@example.com`;
		const studentToken = await registerStudentAndLogin(app, email, 'Password123!', countySlug);
		await markStudentSubmissionReady(prisma, countyId, email);
		const program = await createActiveProgram(prisma, countyId, wardId, `B08 AI Program ${Date.now()}`);
		const draft = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ programId: program.id })
			.expect(201);
		await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ applicationId: draft.body.id as string })
			.expect(201);
		const ingest = await ingestScore(app, draft.body.id as string, countyId, 99.5);
		expect(ingest.body.applicationStatus).toBe('WARD_REVIEW');
		expect(['APPROVED', 'REJECTED', 'DISBURSED']).not.toContain(ingest.body.applicationStatus);
	});
});

async function ingestScore(app: INestApplication, applicationId: string, countyId: string, totalScore: number) {
	return request(app.getHttpServer())
		.post('/api/v1/internal/ai-scores')
		.set('X-Service-Key', serviceKey)
		.send({ applicationId, countyId, totalScore, weightsApplied: { family_income: 0.25 } })
		.expect(201);
}
