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

  it('verifies email, completes phone verification, refreshes, and logs out', async () => {
    const suffix = `${Date.now()}-session`;
    const email = `student.${suffix}@example.com`;
    const password = 'StrongPass123!';
    const agent = request.agent(app.getHttpServer());

    const registerResponse = await agent
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        countySlug: 'turkana',
        fullName: 'Session Student',
        phone: '+254700000004',
      })
      .expect(201);

    const verificationRecord = await prisma.user.findFirst({
      where: { email },
      select: { emailVerifyToken: true },
    });

    expect(typeof verificationRecord?.emailVerifyToken).toBe('string');

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationRecord?.emailVerifyToken })
      .expect(201);

    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({
        email,
        password,
        countySlug: 'turkana',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;
    const loginRefreshCookies = loginResponse.headers['set-cookie'] as unknown as string[] | undefined;
    const loginRefreshCookie = loginRefreshCookies?.find((cookie: string) =>
      cookie.startsWith('__refresh_token='),
    );

    expect(loginRefreshCookie).toBeDefined();

    const phoneOtpResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/send-phone-otp')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(typeof phoneOtpResponse.body.otp).toBe('string');

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-phone-otp')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ otp: phoneOtpResponse.body.otp })
      .expect(201);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', loginRefreshCookie!.split(';')[0])
      .expect(201);
    expect(typeof refreshResponse.body.accessToken).toBe('string');
    expect(typeof refreshResponse.body.refreshToken).toBe('string');

    const rotatedRefreshCookies = refreshResponse.headers['set-cookie'] as unknown as string[] | undefined;
    const rotatedRefreshCookie = rotatedRefreshCookies?.find((cookie: string) =>
      cookie.startsWith('__refresh_token='),
    );

    expect(rotatedRefreshCookie).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', rotatedRefreshCookie!.split(';')[0])
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedRefreshCookie!.split(';')[0])
      .expect(401);
  });
});
