/**
 * Purpose: Validate queue-backed SMS notifications for key workflow status transitions.
 * Why important: Confirms RW-04 delivery records and transition dispatch behavior.
 * Used by: B-07 completion validation for notification integration.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { signToken, waitForDisbursementDetail } from './disbursement-execution.helpers';
import {
  createActiveProgram,
  ensureCountyAndWard,
  markStudentSubmissionReady,
  registerStudentAndLogin,
} from './student-application.helpers';

describe('Notification status change integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let countyId = '';
  let wardId = '';
  let countySlug = 'turkana';
  let financeToken = '';
  let wardToken = '';
  let financeOfficerId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });

    const seeded = await ensureCountyAndWard(prisma, countySlug);
    countyId = seeded.countyId;
    wardId = seeded.wardId;

    const finance = await prisma.user.create({
      data: {
        countyId,
        email: `b07-finance-${Date.now()}@example.com`,
        passwordHash: 'hashed-password',
        role: UserRole.FINANCE_OFFICER,
        emailVerified: true,
        phoneVerified: true,
      },
    });
    financeOfficerId = finance.id;
    financeToken = signToken(jwtService, finance);

    const wardAdmin = await prisma.user.create({
      data: {
        countyId,
        wardId,
        email: `b07-ward-${Date.now()}@example.com`,
        passwordHash: 'hashed-password',
        role: UserRole.WARD_ADMIN,
        emailVerified: true,
        phoneVerified: true,
      },
    });
    wardToken = signToken(jwtService, wardAdmin);
  });

  afterAll(async () => {
    await app.close();
  });

  it('records and exposes notification deliveries across submit, review, and disbursement transitions', async () => {
    const unique = Date.now();
    const email = `b07-student-${unique}@example.com`;
    const password = 'Password123!';

    const studentToken = await registerStudentAndLogin(app, email, password, countySlug);
    await markStudentSubmissionReady(prisma, countyId, email);

    const program = await createActiveProgram(prisma, countyId, wardId, `B07 Program ${unique}`);
    const draft = await request(app.getHttpServer())
      .post('/api/v1/applications/draft')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ programId: program.id })
      .expect(201);

    const applicationId = draft.body.id as string;
    await request(app.getHttpServer())
      .post('/api/v1/applications/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ applicationId })
      .expect(201);

    await prisma.application.update({ where: { id: applicationId }, data: { status: 'WARD_REVIEW' } });

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/review/ward`)
      .set('Authorization', `Bearer ${wardToken}`)
      .send({ decision: 'RECOMMENDED', recommendedAmount: 25000, note: 'Ward recommendation' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${applicationId}/review/county`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ decision: 'APPROVED', allocatedAmount: 22000, note: 'County approved' })
      .expect(200);

    const disbursement = await request(app.getHttpServer())
      .post('/api/v1/disbursements')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ applicationId, disbursementMethod: 'MPESA_B2C', recipientPhone: '+254700123456' })
      .expect(202);

    await waitForDisbursementDetail({
      app,
      token: financeToken,
      disbursementId: disbursement.body.data.disbursementId as string,
      targetStatus: 'SUCCESS',
    });

    await waitForDeliveryStatus(prisma, applicationId, 'APPLICATION_SUBMITTED', 'SENT');
    await waitForDeliveryStatus(prisma, applicationId, 'WARD_REVIEW_RECOMMENDED', 'SENT');
    await waitForDeliveryStatus(prisma, applicationId, 'COUNTY_REVIEW_APPROVED', 'SENT');
    await waitForDeliveryStatus(prisma, applicationId, 'DISBURSEMENT_SUCCESS', 'SENT');

    const deliveries = await request(app.getHttpServer())
      .get(`/api/v1/notifications/deliveries?applicationId=${applicationId}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);

    const events = deliveries.body.data.map((row: { eventType: string }) => row.eventType);
    expect(events).toEqual(
      expect.arrayContaining([
        'APPLICATION_SUBMITTED',
        'WARD_REVIEW_RECOMMENDED',
        'COUNTY_REVIEW_APPROVED',
        'DISBURSEMENT_SUCCESS',
      ]),
    );
  });

  it('persists failed notification delivery records when SMS provider rejects recipient', async () => {
    const unique = Date.now() + 1;
    const email = `b07-fail-student-${unique}@example.com`;
    const password = 'Password123!';

    const studentToken = await registerStudentAndLogin(app, email, password, countySlug);
    await markStudentSubmissionReady(prisma, countyId, email);

    await prisma.user.update({
      where: { email_countyId: { email, countyId } },
      data: { phone: '+254700999999' },
    });

    const program = await createActiveProgram(prisma, countyId, wardId, `B07 Program Fail ${unique}`);
    const draft = await request(app.getHttpServer())
      .post('/api/v1/applications/draft')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ programId: program.id })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/applications/submit')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ applicationId: draft.body.id })
      .expect(201);

    const failedRecord = await waitForDeliveryStatus(prisma, draft.body.id, 'APPLICATION_SUBMITTED', 'FAILED');

    expect(failedRecord.status).toBe('FAILED');
    expect(failedRecord.failureReason).toContain('SMS provider rejected recipient phone number');
  });
});

async function waitForDeliveryStatus(
  prisma: PrismaService,
  applicationId: string,
  eventType: string,
  targetStatus: string,
) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const record = await prisma.notificationDelivery.findFirst({
      where: { applicationId, eventType },
      select: { status: true, failureReason: true },
    });

    if (record && record.status === targetStatus) {
      return record;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Notification ${eventType} for ${applicationId} did not reach ${targetStatus}.`);
}
