/**
 * Purpose: Reuse setup primitives for student application integration flows.
 * Why important: Keeps e2e specs concise and under repository file-size guardrails.
 * Used by: student-application.e2e-spec.ts and profile-gating.e2e-spec.ts.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../database/prisma.service';

export async function ensureCountyAndWard(prisma: PrismaService, countySlug: string) {
	const county = await prisma.county.upsert({
		where: { slug: countySlug },
		update: {},
		create: {
			slug: countySlug,
			name: 'Turkana County',
			fundName: 'Turkana County Education Fund',
			planTier: 'BASIC',
			isActive: true,
		},
	});

	const ward =
		(await prisma.ward.findFirst({ where: { countyId: county.id } })) ??
		(await prisma.ward.create({
			data: {
				countyId: county.id,
				name: 'Central Ward',
				code: `CENT-${Date.now()}`,
			},
		}));

	return { countyId: county.id, wardId: ward.id };
}

export async function registerStudentAndLogin(
	app: INestApplication,
	email: string,
	password: string,
	countySlug: string,
) {
	await request(app.getHttpServer())
		.post('/api/v1/auth/register')
		.send({ email, password, countySlug, fullName: 'Test Student', phone: '+254700000001' })
		.expect(201);

	const loginRes = await request(app.getHttpServer())
		.post('/api/v1/auth/login')
		.send({ email, password, countySlug })
		.expect(201);

	return loginRes.body.accessToken as string;
}

export async function createActiveProgram(
	prisma: PrismaService,
	countyId: string,
	wardId: string,
	name: string,
) {
	const creator = await prisma.user.findFirstOrThrow({ where: { countyId }, select: { id: true } });
	const now = new Date();
	return prisma.bursaryProgram.create({
		data: {
			countyId,
			wardId,
			name,
			description: 'Test bursary program',
			budgetCeiling: 1000000,
			opensAt: now,
			closesAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
			academicYear: '2026',
			status: 'ACTIVE',
			createdBy: creator.id,
		},
		select: { id: true },
	});
}

export async function createClosedProgram(
	prisma: PrismaService,
	countyId: string,
	wardId: string,
	name: string,
) {
	const creator = await prisma.user.findFirstOrThrow({ where: { countyId }, select: { id: true } });
	return prisma.bursaryProgram.create({
		data: {
			countyId,
			wardId,
			name,
			budgetCeiling: 500000,
			opensAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
			closesAt: new Date(Date.now() - 1000),
			academicYear: '2025',
			status: 'ACTIVE',
			createdBy: creator.id,
		},
		select: { id: true },
	});
}

export async function markStudentSubmissionReady(
	prisma: PrismaService,
	countyId: string,
	email: string,
) {
	const student = await prisma.user.findFirstOrThrow({
		where: { countyId, email },
		select: { id: true },
	});

	await prisma.user.update({
		where: { id: student.id },
		data: { emailVerified: true, phoneVerified: true },
	});

	await prisma.academicInfo.upsert({
		where: { userId: student.id },
		update: { institutionType: 'UNIVERSITY', institutionName: 'Test University' },
		create: {
			userId: student.id,
			countyId,
			institutionType: 'UNIVERSITY',
			institutionName: 'Test University',
		},
	});

	await prisma.familyFinancialInfo.upsert({
		where: { userId: student.id },
		update: { familyStatus: 'TWO_PARENTS' },
		create: { userId: student.id, countyId, familyStatus: 'TWO_PARENTS' },
	});
}
