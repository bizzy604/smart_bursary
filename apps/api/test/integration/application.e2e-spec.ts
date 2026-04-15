/**
 * Purpose: Validate bootstrap behavior and health endpoint contract.
 * Why important: Proves P0 runtime wiring works before deeper feature phases begin.
 * Used by: Phase P0 validation checklist in IMPLEMENTATION_TRACKER.md.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Application Bootstrap (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(PrismaService)
			.useValue({
				withTenantContext: jest.fn(),
				$connect: jest.fn(),
				$disconnect: jest.fn(),
			})
			.compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	it('returns service health', async () => {
		const response = await request(app.getHttpServer())
			.get('/api/v1/health')
			.expect(200);

		expect(response.body.status).toBe('ok');
		expect(response.body.service).toBe('api');
		expect(typeof response.body.timestamp).toBe('string');
	});

	it('returns 404 on unknown route', async () => {
		await request(app.getHttpServer()).get('/api/v1/not-found').expect(404);
	});
});
