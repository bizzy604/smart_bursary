/**
 * Purpose: Validate auth, JWT protection, and RBAC behavior using real HTTP requests.
 * Why important: Confirms P2 identity and authorization controls work in app runtime.
 * Used by: Phase P2 validation checklist.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Auth and RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const existing = await prisma.county.findUnique({ where: { slug: 'turkana' } });
    if (!existing) {
      await prisma.county.create({
        data: {
          slug: 'turkana',
          name: 'Turkana County',
          fundName: 'Turkana County Education Fund',
          planTier: 'BASIC',
          isActive: true,
        },
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, and accesses /auth/me with token', async () => {
    const suffix = Date.now().toString();
    const email = `student.${suffix}@example.com`;
    const password = 'StrongPass123!';

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        countySlug: 'turkana',
        fullName: 'Test Student',
        phone: '+254700000001',
      })
      .expect(201);

    expect(typeof registerResponse.body.accessToken).toBe('string');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password,
        countySlug: 'turkana',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;
    expect(accessToken.length).toBeGreaterThan(20);

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meResponse.body.email).toBe(email);
    expect(meResponse.body.countyId).toBeDefined();
  });

  it('rejects anonymous /auth/me and enforces role guard on admin probe', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const suffix = `${Date.now()}-rbac`;
    const email = `student.${suffix}@example.com`;
    const password = 'StrongPass123!';

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        countySlug: 'turkana',
        fullName: 'RBAC Student',
        phone: '+254700000002',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .get('/api/v1/auth/admin-probe')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('issues OTP reset token and allows login with the new password only', async () => {
    const suffix = `${Date.now()}-reset`;
    const email = `student.${suffix}@example.com`;
    const oldPassword = 'StrongPass123!';
    const newPassword = 'EvenStronger456!';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: oldPassword,
        countySlug: 'turkana',
        fullName: 'Reset Student',
        phone: '+254700000003',
      })
      .expect(201);

    const requestResetResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/request-password-reset')
      .send({
        email,
        countySlug: 'turkana',
      })
      .expect(201);

    expect(requestResetResponse.body.accepted).toBe(true);
    expect(typeof requestResetResponse.body.otp).toBe('string');

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        email,
        countySlug: 'turkana',
        otp: requestResetResponse.body.otp,
        password: newPassword,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password: oldPassword,
        countySlug: 'turkana',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email,
        password: newPassword,
        countySlug: 'turkana',
      })
      .expect(201);
  });

});
