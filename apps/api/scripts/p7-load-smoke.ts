/**
 * Purpose: Run a lightweight concurrent load smoke check against the API health endpoint.
 * Why important: Provides repeatable P7 performance baseline evidence with p95 latency budget checks.
 * Used by: Phase 7 hardening validation and release readiness evidence collection.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

type SmokeResult = {
	totalRequests: number;
	concurrency: number;
	elapsedMs: number;
	meanMs: number;
	p95Ms: number;
	minMs: number;
	maxMs: number;
	rps: number;
};

type ErrorWithCode = Error & { code?: string };

const TRANSIENT_NETWORK_ERROR_CODES = new Set([
	'ECONNRESET',
	'ECONNABORTED',
	'ETIMEDOUT',
	'EPIPE',
	'UND_ERR_SOCKET',
]);

function percentile(values: number[], p: number): number {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
	return sorted[index] ?? 0;
}

function mean(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}

	const sum = values.reduce((acc, value) => acc + value, 0);
	return sum / values.length;
}

function isTransientNetworkError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	const code = (error as ErrorWithCode).code;
	if (typeof code === 'string' && TRANSIENT_NETWORK_ERROR_CODES.has(code)) {
		return true;
	}

	return /ECONNRESET|ECONNABORTED|socket hang up|aborted/i.test(error.message);
}

async function requestHealthWithRetry(app: INestApplication, requestId: string): Promise<number> {
	const maxAttempts = 3;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const requestStart = process.hrtime.bigint();

		try {
			await request(app.getHttpServer())
				.get('/api/v1/health')
				.set('x-request-id', requestId)
				.set('connection', 'close')
				.expect(200);
			return Number(process.hrtime.bigint() - requestStart) / 1_000_000;
		} catch (error) {
			if (!isTransientNetworkError(error) || attempt === maxAttempts) {
				throw error;
			}
		}
	}

	throw new Error('Unexpected request retry termination.');
}

async function runLoadSmoke(): Promise<SmokeResult> {
	const totalRequests = Number(process.env.P7_LOAD_TOTAL_REQUESTS ?? 240);
	const concurrency = Number(process.env.P7_LOAD_CONCURRENCY ?? 24);
	const originalRedisUrl = process.env.REDIS_URL;
	delete process.env.REDIS_URL;

	let app: INestApplication | undefined;

	try {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(PrismaService)
			.useValue({
				withTenantContext: async () => null,
				$connect: async () => undefined,
				$disconnect: async () => undefined,
			})
			.compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		for (let index = 0; index < 20; index += 1) {
			await requestHealthWithRetry(app, `p7-warmup-${index}`);
		}

		const durations: number[] = [];
		let cursor = 0;
		const startedAt = process.hrtime.bigint();

		const workers = Array.from({ length: concurrency }, async () => {
			while (cursor < totalRequests) {
				const requestIndex = cursor;
				cursor += 1;

				const requestElapsed = await requestHealthWithRetry(app!, `p7-load-${requestIndex}`);
				durations.push(requestElapsed);
			}
		});

		await Promise.all(workers);
		const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

		return {
			totalRequests,
			concurrency,
			elapsedMs,
			meanMs: mean(durations),
			p95Ms: percentile(durations, 95),
			minMs: Math.min(...durations),
			maxMs: Math.max(...durations),
			rps: (totalRequests / elapsedMs) * 1000,
		};
	} finally {
		if (app) {
			await app.close();
		}

		if (typeof originalRedisUrl === 'string') {
			process.env.REDIS_URL = originalRedisUrl;
		} else {
			delete process.env.REDIS_URL;
		}
	}
}

void (async () => {
	const p95BudgetMs = Number(process.env.P7_HEALTH_P95_BUDGET_MS ?? 250);
	const result = await runLoadSmoke();

	console.log('P7 load smoke summary');
	console.log(`- totalRequests: ${result.totalRequests}`);
	console.log(`- concurrency: ${result.concurrency}`);
	console.log(`- elapsedMs: ${result.elapsedMs.toFixed(1)}`);
	console.log(`- requestsPerSecond: ${result.rps.toFixed(1)}`);
	console.log(`- meanMs: ${result.meanMs.toFixed(2)}`);
	console.log(`- p95Ms: ${result.p95Ms.toFixed(2)}`);
	console.log(`- minMs: ${result.minMs.toFixed(2)}`);
	console.log(`- maxMs: ${result.maxMs.toFixed(2)}`);
	console.log(`- p95BudgetMs: ${p95BudgetMs.toFixed(2)}`);

	if (result.p95Ms > p95BudgetMs) {
		throw new Error(`P7 load smoke failed: p95 ${result.p95Ms.toFixed(2)}ms exceeded budget ${p95BudgetMs.toFixed(2)}ms`);
	}

	console.log('P7 load smoke passed.');
})();