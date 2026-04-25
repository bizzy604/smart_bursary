/**
 * Purpose: Validate profile APIs and submission readiness gating semantics.
 * Why important: Enforces SP-01 and AU verification behavior before first submission.
 * Used by: Phase 2A integration validation suite.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import {
	createActiveProgram,
	ensureCountyAndWard,
	registerStudentAndLoginDetailed,
} from './student-application.helpers';

describe('Profile Gating (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let studentToken = '';
	let emailVerificationToken = '';
	let countyId = '';
	let wardId = '';
	let programId = '';
	let applicationId = '';
	let studentEmail = '';

	const countySlug = `profile-gating-${Date.now()}`;
	const password = 'StrongPass123!';

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('api/v1');
		await app.init();

		prisma = moduleFixture.get(PrismaService);
		const seeded = await ensureCountyAndWard(prisma, countySlug);
		countyId = seeded.countyId;
		wardId = seeded.wardId;

		studentEmail = `profile.gating.${Date.now()}@example.com`;
		const registered = await registerStudentAndLoginDetailed(app, studentEmail, password, countySlug);
		studentToken = registered.accessToken;
		emailVerificationToken = registered.emailVerificationToken;
		programId = (await createActiveProgram(prisma, countyId, wardId, 'Profile Gating Program')).id;

		const draftRes = await request(app.getHttpServer())
			.post('/api/v1/applications/draft')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ programId })
			.expect(201);

		applicationId = draftRes.body.id;
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns profile and completion endpoints for the authenticated student', async () => {
		const profileRes = await request(app.getHttpServer())
			.get('/api/v1/profile')
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);
		expect(profileRes.body.personal.fullName).toBeTruthy();

		const completionRes = await request(app.getHttpServer())
			.get('/api/v1/profile/completion')
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);
		expect(completionRes.body.overallComplete).toBe(false);
		expect(completionRes.body.missingSections).toContain('academic');
	});

	it('rejects submit with PROFILE_INCOMPLETE before verification and profile completion', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ applicationId })
			.expect(422);

		const code = response.body.error?.code ?? response.body.code ?? response.body.message?.code;
		expect(code).toBe('PROFILE_INCOMPLETE');
	});

	it('accepts profile updates and allows submit after verification and completion', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/auth/verify-email')
			.send({ token: emailVerificationToken })
			.expect(201);

		const otpRes = await request(app.getHttpServer())
			.post('/api/v1/auth/send-phone-otp')
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(201);

		await request(app.getHttpServer())
			.post('/api/v1/auth/verify-phone-otp')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ otp: otpRes.body.otp })
			.expect(201);

		await request(app.getHttpServer())
			.patch('/api/v1/profile/personal')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ homeWard: 'Kalokol', villageUnit: 'Nakuprat' })
			.expect(200);

		await request(app.getHttpServer())
			.patch('/api/v1/profile/academic')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ institutionType: 'UNIVERSITY', institutionName: 'University of Nairobi' })
			.expect(200);

		await request(app.getHttpServer())
			.patch('/api/v1/profile/family')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ familyStatus: 'TWO_PARENTS' })
			.expect(200);

		const completionRes = await request(app.getHttpServer())
			.get('/api/v1/profile/completion')
			.set('Authorization', `Bearer ${studentToken}`)
			.expect(200);
		expect(completionRes.body.overallComplete).toBe(true);
		expect(completionRes.body.emailVerified).toBe(true);
		expect(completionRes.body.phoneVerified).toBe(true);

		const submitRes = await request(app.getHttpServer())
			.post('/api/v1/applications/submit')
			.set('Authorization', `Bearer ${studentToken}`)
			.send({ applicationId })
			.expect(201);

		expect(submitRes.body.status).toBe('SUBMITTED');
	});
});
