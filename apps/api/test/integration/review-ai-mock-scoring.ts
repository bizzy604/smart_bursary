/**
 * Purpose: Provide AI scoring mock server utilities for review integration tests.
 * Why important: Exercises submit-to-queue-to-ingest flow without running the Python service in test.
 * Used by: review-ai.e2e-spec.ts and review-ai-failure.e2e-spec.ts.
 */
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import request from 'supertest';

export type MockAiScoringService = {
	baseUrl: string;
	close: () => Promise<void>;
};

export async function startMockAiScoringService(
	app: INestApplication,
	internalServiceKey: string,
): Promise<MockAiScoringService> {
	const server = createServer(async (req, res) => {
		if (req.method !== 'POST' || req.url !== '/score') {
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Not found' }));
			return;
		}

		try {
			const payload = await readJsonBody(req);
			const applicationId = String(payload.application_id ?? payload.applicationId ?? '').trim();
			if (!applicationId) {
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'application_id is required' }));
				return;
			}

			const applicationResponse = await request(app.getHttpServer())
				.get(`/api/v1/internal/applications/${applicationId}`)
				.set('X-Service-Key', internalServiceKey)
				.expect(200);
			const applicationData = applicationResponse.body?.data as Record<string, unknown>;
			const countyId = String(applicationData.county_id ?? payload.county_id ?? '').trim();
			const totalScore = 78.5;

			await request(app.getHttpServer())
				.post('/api/v1/internal/ai-scores')
				.set('X-Service-Key', internalServiceKey)
				.send({
					applicationId,
					countyId,
					totalScore,
					familyStatusScore: 25,
					familyIncomeScore: 20,
					educationBurdenScore: 15,
					academicStandingScore: 10.5,
					documentQualityScore: 8,
					integrityScore: 0,
					weightsApplied: {
						family_status: 0.3,
						family_income: 0.25,
						education_burden: 0.2,
						academic_standing: 0.1,
						document_quality: 0.1,
						integrity: 0.05,
					},
					anomalyFlags: [],
					documentAnalysis: {},
					modelVersion: 'v1.2.0',
				})
				.expect(201);

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ data: { application_id: applicationId, total_score: totalScore } }));
		} catch (error) {
			res.writeHead(502, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: error instanceof Error ? error.message : 'Scoring stub error',
				}),
			);
		}
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
	const address = server.address() as AddressInfo;

	return {
		baseUrl: `http://127.0.0.1:${address.port}`,
		close: async () => {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		},
	};
}

export async function waitForAiScoreCard(
	prisma: PrismaClient,
	applicationId: string,
	timeoutMs = 5000,
): Promise<void> {
	const startedAt = Date.now();

	while (Date.now() - startedAt <= timeoutMs) {
		const scoreCard = await prisma.aIScoreCard.findUnique({
			where: { applicationId },
			select: { id: true },
		});
		if (scoreCard) {
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	throw new Error(`Timed out waiting for AI score card for application ${applicationId}.`);
}

function readJsonBody(req: NodeJS.ReadableStream): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', (chunk) => {
			body += chunk.toString();
		});
		req.on('end', () => {
			if (!body.trim()) {
				resolve({});
				return;
			}

			try {
				resolve(JSON.parse(body) as Record<string, unknown>);
			} catch (error) {
				reject(error);
			}
		});
		req.on('error', reject);
	});
}
