/**
 * Purpose: Validate auth boundary behavior for disbursement endpoints.
 * Why important: Ensures disbursement routes are never accessible anonymously.
 * Used by: Integration checks for the disbursement module.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';

describe('Disbursement module auth boundaries (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('rejects unauthenticated disbursement creation', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/disbursements')
			.send({
				applicationId: '00000000-0000-0000-0000-000000000000',
				disbursementMethod: 'MPESA_B2C',
			})
			.expect(403);
	});

	it('rejects unauthenticated disbursement listing', async () => {
		await request(app.getHttpServer())
			.get('/api/v1/disbursements')
			.expect(403);
	});
});
