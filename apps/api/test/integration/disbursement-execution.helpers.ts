/**
 * Purpose: Provide reusable setup helpers for disbursement execution integration tests.
 * Why important: Keeps B-05 e2e coverage files within backend line-size limits.
 * Used by: disbursement-execution.e2e-spec.ts.
 */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';
import request from 'supertest';

export async function createApprovedApplicationFixture(args: {
	prisma: PrismaService;
	jwtService: JwtService;
	countyId: string;
	wardId: string;
	financeOfficerId: string;
	amountAllocated: number;
}) {
	const unique = Date.now() + Math.floor(Math.random() * 1000);
	const student = await args.prisma.user.create({
		data: {
			countyId: args.countyId,
			wardId: args.wardId,
			email: `b05-student-${unique}@example.com`,
			phone: '+254711000111',
			passwordHash: 'hashed-password',
			role: UserRole.STUDENT,
			emailVerified: true,
			phoneVerified: true,
		},
	});
	await args.prisma.studentProfile.create({
		data: { userId: student.id, countyId: args.countyId, fullName: `Student ${unique}` },
	});
	await args.prisma.academicInfo.create({
		data: {
			userId: student.id,
			countyId: args.countyId,
			bankName: 'Kenya Commercial Bank',
			bankAccountNumber: Buffer.from('1234567890', 'utf8'),
		},
	});

	const program = await args.prisma.bursaryProgram.create({
		data: {
			countyId: args.countyId,
			wardId: args.wardId,
			name: `B05 Program ${unique}`,
			description: 'B05 disbursement integration test program',
			budgetCeiling: 200000,
			opensAt: new Date(),
			closesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			academicYear: '2026',
			status: 'ACTIVE',
			createdBy: args.financeOfficerId,
		},
	});

	const application = await args.prisma.application.create({
		data: {
			countyId: args.countyId,
			programId: program.id,
			wardId: args.wardId,
			applicantId: student.id,
			status: 'APPROVED',
			submissionReference: `APP-${unique}`,
			amountAllocated: args.amountAllocated,
		},
	});

	await args.prisma.applicationReview.create({
		data: {
			applicationId: application.id,
			countyId: args.countyId,
			reviewerId: args.financeOfficerId,
			stage: 'COUNTY_REVIEW',
			decision: 'APPROVED',
			allocatedAmount: args.amountAllocated,
			note: 'Approved for B05 disbursement test',
		},
	});

	return {
		applicationId: application.id,
		studentToken: signToken(args.jwtService, student),
	};
}

export async function waitForDisbursementDetail(args: {
	app: INestApplication;
	token: string;
	disbursementId: string;
	targetStatus: 'SUCCESS' | 'FAILED';
	targetRetryCount?: number;
}) {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const response = await request(args.app.getHttpServer())
			.get(`/api/v1/disbursements/${args.disbursementId}`)
			.set('Authorization', `Bearer ${args.token}`)
			.expect(200);
		const detail = response.body.data;
		if (
			detail.status === args.targetStatus &&
			(args.targetRetryCount === undefined || detail.retryCount === args.targetRetryCount)
		) {
			return detail;
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	throw new Error(
		`Disbursement ${args.disbursementId} did not reach status ${args.targetStatus} in time.`,
	);
}

export function signToken(
	jwtService: JwtService,
	user: { id: string; email: string; role: UserRole; countyId: string; wardId: string | null },
) {
	return jwtService.sign({
		sub: user.id,
		email: user.email,
		role: user.role,
		countyId: user.countyId,
		wardId: user.wardId,
	});
}
