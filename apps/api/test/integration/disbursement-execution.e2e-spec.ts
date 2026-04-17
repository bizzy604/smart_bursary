/**
 * Purpose: Validate disbursement execution retries, receipt downloads, and EFT batch export flows.
 * Why important: Confirms B-05 payout reliability and downloadable finance/student artifacts.
 * Used by: B-05 completion validation for DB-01 through DB-04 requirements.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import {
	createApprovedApplicationFixture,
	signToken,
	waitForDisbursementDetail,
} from './disbursement-execution.helpers';

describe('Disbursement execution lifecycle (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let jwtService: JwtService;
	let countyId = '';
	let wardId = '';
	let financeOfficerId = '';
	let financeOfficerToken = '';
	let failedDisbursementId = '';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });

		const county = await prisma.county.findUniqueOrThrow({ where: { slug: 'turkana' } });
		countyId = county.id;

		const ward =
			(await prisma.ward.findFirst({ where: { countyId } })) ??
			(await prisma.ward.create({ data: { countyId, name: 'Disbursement Ward', code: `DISB-${Date.now()}` } }));
		wardId = ward.id;

		const financeOfficer = await prisma.user.create({
			data: {
				countyId,
				email: `b05-finance-${Date.now()}@example.com`,
				passwordHash: 'hashed-password',
				role: UserRole.FINANCE_OFFICER,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		financeOfficerId = financeOfficer.id;
		financeOfficerToken = signToken(jwtService, financeOfficer);
	});

	afterAll(async () => {
		await app.close();
	});

	it('processes successful M-Pesa payouts and serves receipt PDFs', async () => {
		const fixture = await createApprovedApplicationFixture({
			prisma,
			jwtService,
			countyId,
			wardId,
			financeOfficerId,
			amountAllocated: 50000,
		});
		const start = await request(app.getHttpServer())
			.post('/api/v1/disbursements')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.send({
				applicationId: fixture.applicationId,
				disbursementMethod: 'MPESA_B2C',
				recipientPhone: '+254700123456',
			})
			.expect(202);

		const disbursementId = start.body.data.disbursementId as string;
		const detail = await waitForDisbursementDetail({
			app,
			token: financeOfficerToken,
			disbursementId,
			targetStatus: 'SUCCESS',
		});
		expect(detail.transactionId).toContain('MOCK-MPESA');

		const financeReceipt = await request(app.getHttpServer())
			.get(`/api/v1/disbursements/${disbursementId}/receipt`)
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(200);
		expect(financeReceipt.headers['content-type']).toContain('application/pdf');

		const studentReceipt = await request(app.getHttpServer())
			.get(`/api/v1/disbursements/application/${fixture.applicationId}/receipt`)
			.set('Authorization', `Bearer ${fixture.studentToken}`)
			.expect(200);
		expect(studentReceipt.headers['content-type']).toContain('application/pdf');
	});

	it('retries failed payouts up to terminal failure and supports manual retry', async () => {
		const fixture = await createApprovedApplicationFixture({
			prisma,
			jwtService,
			countyId,
			wardId,
			financeOfficerId,
			amountAllocated: 42000,
		});
		const start = await request(app.getHttpServer())
			.post('/api/v1/disbursements')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.send({
				applicationId: fixture.applicationId,
				disbursementMethod: 'MPESA_B2C',
				recipientPhone: '+254700999999',
			})
			.expect(202);

		failedDisbursementId = start.body.data.disbursementId as string;
		const failed = await waitForDisbursementDetail({
			app,
			token: financeOfficerToken,
			disbursementId: failedDisbursementId,
			targetStatus: 'FAILED',
			targetRetryCount: 3,
		});
		expect(failed.retryCount).toBe(3);
		expect(failed.failureReason).toContain('Simulated M-Pesa provider failure');

		const intervention = await prisma.applicationTimeline.findFirst({
			where: {
				applicationId: fixture.applicationId,
				eventType: 'DISBURSEMENT_MANUAL_INTERVENTION_REQUIRED',
			},
		});
		expect(intervention).toBeTruthy();

		await prisma.disbursementRecord.update({
			where: { id: failedDisbursementId },
			data: { recipientPhone: '+254700123456' },
		});

		await request(app.getHttpServer())
			.post(`/api/v1/disbursements/${failedDisbursementId}/retry`)
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.expect(202);

		const recovered = await waitForDisbursementDetail({
			app,
			token: financeOfficerToken,
			disbursementId: failedDisbursementId,
			targetStatus: 'SUCCESS',
		});
		expect(recovered.status).toBe('SUCCESS');
	});

	it('generates downloadable RTGS csv exports for approved applications', async () => {
		const fixture = await createApprovedApplicationFixture({
			prisma,
			jwtService,
			countyId,
			wardId,
			financeOfficerId,
			amountAllocated: 36000,
		});
		const response = await request(app.getHttpServer())
			.post('/api/v1/disbursements/batch/eft')
			.set('Authorization', `Bearer ${financeOfficerToken}`)
			.send({ applicationIds: [fixture.applicationId], batchName: 'b05-rtgs-export' })
			.expect(200);

		expect(response.headers['content-type']).toContain('text/csv');
		expect(response.text).toContain('Recipient Name,Bank Name,Bank Account,Amount (KES),Reference');
	});
});
