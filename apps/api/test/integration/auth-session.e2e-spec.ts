/**
 * Purpose: Validate email verification, phone OTP, refresh rotation, and logout revocation flows.
 * Why important: Confirms session lifecycle endpoints behave correctly with refresh-token cookies.
 * Used by: Auth hardening validation and regression protection for token lifecycle behavior.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Auth session lifecycle (e2e)', () => {
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

  it('verifies email, completes phone verification, refreshes, and logs out', async () => {
    const suffix = `${Date.now()}-session`;
    const email = `student.${suffix}@example.com`;
    const password = 'StrongPass123!';

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        countySlug: 'turkana',
        fullName: 'Session Student',
        phone: '+254700000004',
      })
      .expect(201);

    const emailVerificationToken = registerResponse.body.emailVerificationToken as string | undefined;
    expect(typeof emailVerificationToken).toBe('string');

    const persistedRecord = await prisma.user.findFirst({
      where: { email },
      select: { emailVerifyToken: true },
    });
    expect(persistedRecord?.emailVerifyToken).not.toBe(emailVerificationToken);
    expect(typeof persistedRecord?.emailVerifyToken).toBe('string');

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: emailVerificationToken })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
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
