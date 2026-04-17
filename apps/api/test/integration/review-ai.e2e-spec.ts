/**
 * Purpose: Validate review, AI score retrieval, and allocation workflow end to end.
 * Why important: Proves P5 status transitions, role gates, timeline writes, and budget checks.
 * Used by: P5 completion gate and release validation.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { seedReviewWorkflow } from './review-ai.helpers';
import {
	MockAiScoringService,
	startMockAiScoringService,
	waitForAiScoreCard,
} from './review-ai-mock-scoring';

const serviceKey = 'test-internal-service-key';

describe('Review and AI workflow (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let applicationId = '';
	let programId = '';
	let wardAdminToken = '';
	let countyAdminToken = '';
	let financeOfficerToken = '';
	let studentToken = '';
	let mockAiScoringService: MockAiScoringService | null = null;

	beforeAll(async () => {
		process.env.INTERNAL_SERVICE_KEY = serviceKey;

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		const jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });
		const seed = await seedReviewWorkflow({ prisma, jwtService, countySlug: 'turkana' });
		await prisma.county.update({
			where: { id: seed.countyId },
			data: { planTier: 'ENTERPRISE' },
		});
		programId = seed.programId;
		studentToken = seed.studentToken;
		wardAdminToken = seed.wardAdminToken;
		countyAdminToken = seed.countyAdminToken;
		financeOfficerToken = seed.financeOfficerToken;

		mockAiScoringService = await startMockAiScoringService(app, serviceKey);
		process.env.AI_SCORING_SERVICE_URL = mockAiScoringService.baseUrl;
		process.env.AI_SCORING_REQUEST_TIMEOUT_MS = '2000';

		const draftResponse = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ programId })
			.expect(201);

		applicationId = draftResponse.body.id;

		await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ applicationId })
			.expect(201);

		await waitForAiScoreCard(prisma, applicationId);
	});

	afterAll(async () => {
		await mockAiScoringService?.close();
		await app.close();
	});

	it('returns the AI score card to review roles', async () => {
		const response = await request(app.getHttpServer())
			.get(`/api/v1/applications/${applicationId}/score`)
			.set('Authorization', `Bearer ${wardAdminToken}`)
			.expect(200);

		expect(response.body.data.applicationId).toBe(applicationId);
		expect(response.body.data.grade).toBe('MEDIUM');
		expect(response.body.data.totalScore).toBe(78.5);
	});

	it('lists ranked program scores for the ward reviewer', async () => {
		const response = await request(app.getHttpServer())
			.get(`/api/v1/programs/${programId}/scores`)
			.set('Authorization', `Bearer ${wardAdminToken}`)
			.expect(200);

		expect(Array.isArray(response.body.data)).toBe(true);
		expect(response.body.data[0].applicationId).toBe(applicationId);
		expect(response.body.data[0].totalScore).toBe(78.5);
	});

	it('updates scoring weights for county admins', async () => {
		const response = await request(app.getHttpServer())
			.patch('/api/v1/admin/scoring-weights')
			.set('Authorization', `Bearer ${countyAdminToken}`)
			.send({
				family_status: 0.3,
				family_income: 0.25,
				education_burden: 0.2,
				academic_standing: 0.1,
				document_quality: 0.1,
				integrity: 0.05,
			})
			.expect(200);

		expect(response.body.data.weightsUpdated).toBe(true);
	});

	it('allows ward review recommendation and county allocation in sequence', async () => {
		const wardReview = await request(app.getHttpServer())
			.post(`/api/v1/applications/${applicationId}/review/ward`)
			.set('Authorization', `Bearer ${wardAdminToken}`)
			.send({ decision: 'RECOMMENDED', recommendedAmount: 40000, note: 'Verified by ward committee.' })
			.expect(200);

		expect(wardReview.body.newStatus).toBe('COUNTY_REVIEW');

		const countyReview = await request(app.getHttpServer())
			.post(`/api/v1/applications/${applicationId}/review/county`)
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.send({ decision: 'APPROVED', allocatedAmount: 38000, note: 'Approved within budget ceiling.' })
			.expect(200);

		expect(countyReview.body.newStatus).toBe('APPROVED');
		expect(countyReview.body.budgetRemaining).toBe(62000);
	});

	it('keeps the application timeline complete after review actions', async () => {
		const application = await prisma.application.findUniqueOrThrow({
			where: { id: applicationId },
			select: {
				status: true,
				reviews: { select: { stage: true, decision: true } },
				timeline: { select: { eventType: true, fromStatus: true, toStatus: true } },
			},
		});

		expect(application.status).toBe('APPROVED');
		expect(application.reviews.length).toBeGreaterThanOrEqual(2);
		expect(application.timeline.some((entry) => entry.eventType === 'AI_SCORING_QUEUED')).toBe(true);
		expect(application.timeline.some((entry) => entry.eventType === 'AI_SCORED')).toBe(true);
		expect(application.timeline.some((entry) => entry.eventType === 'WARD_REVIEW_RECOMMENDED')).toBe(true);
		expect(application.timeline.some((entry) => entry.eventType === 'COUNTY_REVIEW_APPROVED')).toBe(true);
	});
});
