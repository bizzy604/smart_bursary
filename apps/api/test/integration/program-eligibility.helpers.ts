/**
 * Purpose: Share auth helpers for program eligibility integration tests.
 * Why important: Keeps test specs under repository file-size governance limits.
 * Used by: program-eligibility.e2e-spec.ts.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function registerStudentUser(
	app: INestApplication,
	email: string,
	password: string,
	countySlug: string,
	fullName: string,
) {
	await request(app.getHttpServer()).post('/api/v1/auth/register').send({
		email,
		password,
		countySlug,
		fullName,
		phone: `+2547${Math.floor(Math.random() * 90000000 + 10000000)}`,
	});
}

export async function loginStudentToken(
	app: INestApplication,
	email: string,
	password: string,
	countySlug: string,
): Promise<string> {
	const response = await request(app.getHttpServer())
		.post('/api/v1/auth/login')
		.send({ email, password, countySlug })
		.expect(201);
	return response.body.accessToken;
}
