/**
 * Purpose: Validate AI scoring failure handling after submission.
 * Why important: Ensures submission is resilient and failure state is visible when scoring is unavailable.
 * Used by: B-02 negative-path validation for AI queue lifecycle.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { seedReviewWorkflow } from './review-ai.helpers';

describe('Review and AI scoring failure handling (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let applicationId = '';
	let studentToken = '';
	let programId = '';

	beforeAll(async () => {
		process.env.INTERNAL_SERVICE_KEY = 'test-internal-service-key';
		process.env.AI_SCORING_SERVICE_URL = 'http://127.0.0.1:9';
		process.env.AI_SCORING_REQUEST_TIMEOUT_MS = '200';

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		const jwtService = new JwtService({
			secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret',
		});
		const seed = await seedReviewWorkflow({
			prisma,
			jwtService,
			countySlug: 'turkana',
		});
		studentToken = seed.studentToken;
		programId = seed.programId;

		const draftResponse = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ programId })
			.expect(201);
		applicationId = draftResponse.body.id;
	});

	afterAll(async () => {
		await app.close();
	});

	it('keeps submission successful and records scoring failure lifecycle events', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ applicationId })
			.expect(201);

		const failureEvent = await waitForFailureEvent(prisma, applicationId, 10000);
		expect(['AI_SCORING_QUEUE_FAILED', 'AI_SCORING_FAILED']).toContain(failureEvent);

		const application = await prisma.application.findUniqueOrThrow({
			where: { id: applicationId },
			select: {
				status: true,
				scoreCard: {
					select: { id: true },
				},
			},
		});
		expect(application.status).toBe('SUBMITTED');
		expect(application.scoreCard).toBeNull();
	});
});

async function waitForFailureEvent(
	prisma: PrismaService,
	applicationId: string,
	timeoutMs: number,
): Promise<string> {
	const startedAt = Date.now();

	while (Date.now() - startedAt <= timeoutMs) {
		const timeline = await prisma.applicationTimeline.findMany({
			where: {
				applicationId,
				eventType: {
					in: ['AI_SCORING_QUEUE_FAILED', 'AI_SCORING_FAILED'],
				},
			},
			select: {
				eventType: true,
			},
			orderBy: { occurredAt: 'desc' },
		});

		if (timeline.length > 0) {
			return timeline[0].eventType;
		}

		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	throw new Error(`Timed out waiting for AI failure timeline event for application ${applicationId}.`);
}
