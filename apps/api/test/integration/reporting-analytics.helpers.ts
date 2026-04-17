/**
 * Purpose: Seed reusable county reporting fixtures for analytics and export integration tests.
 * Why important: Keeps B-06 reporting specs concise while creating realistic reportable records.
 * Used by: reporting-analytics.e2e-spec.ts.
 */
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserRole } from '@prisma/client';

export type ReportingSeed = {
	programAId: string;
	programBId: string;
	wardId: string;
};

export async function seedReportingDataset(args: {
	prisma: PrismaClient;
	countyId: string;
	wardId: string;
	wardAdminId: string;
	financeOfficerId: string;
}): Promise<ReportingSeed> {
	const programA = await args.prisma.bursaryProgram.create({
		data: {
			countyId: args.countyId,
			wardId: args.wardId,
			name: `B06 Program A ${Date.now()}`,
			description: 'Primary reporting analytics fixture',
			budgetCeiling: 250000,
			allocatedTotal: 70000,
			disbursedTotal: 40000,
			opensAt: new Date(),
			closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			academicYear: '2026',
			status: 'ACTIVE',
			createdBy: args.financeOfficerId,
		},
	});

	const programB = await args.prisma.bursaryProgram.create({
		data: {
			countyId: args.countyId,
			wardId: args.wardId,
			name: `B06 Program B ${Date.now()}`,
			description: 'Historical trend fixture',
			budgetCeiling: 150000,
			allocatedTotal: 25000,
			disbursedTotal: 0,
			opensAt: new Date(),
			closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			academicYear: '2025',
			status: 'ACTIVE',
			createdBy: args.financeOfficerId,
		},
	});

	const studentA = await createStudent(args.prisma, args.countyId, args.wardId, 'UNIVERSITY');
	const studentB = await createStudent(args.prisma, args.countyId, args.wardId, 'TVET');
	const studentC = await createStudent(args.prisma, args.countyId, args.wardId, 'UNIVERSITY');

	const disbursedApp = await createApplication(args.prisma, {
		countyId: args.countyId,
		wardId: args.wardId,
		programId: programA.id,
		applicantId: studentA,
		status: 'DISBURSED',
		amountAllocated: 40000,
		reference: `B06-D-${Date.now()}`,
	});
	await attachReviewAndScore(args.prisma, {
		applicationId: disbursedApp.id,
		countyId: args.countyId,
		wardAdminId: args.wardAdminId,
		financeOfficerId: args.financeOfficerId,
		recommendedAmount: 42000,
		allocatedAmount: 40000,
		totalScore: 82.5,
	});
	await args.prisma.disbursementRecord.create({
		data: {
			applicationId: disbursedApp.id,
			countyId: args.countyId,
			programId: programA.id,
			disbursementMethod: 'MPESA_B2C',
			amountKes: 40000,
			status: 'SUCCESS',
			initiatedBy: args.financeOfficerId,
			transactionId: `B06-TX-${Date.now()}`,
			confirmedAt: new Date(),
		},
	});

	const approvedApp = await createApplication(args.prisma, {
		countyId: args.countyId,
		wardId: args.wardId,
		programId: programA.id,
		applicantId: studentB,
		status: 'APPROVED',
		amountAllocated: 30000,
		reference: `B06-A-${Date.now()}`,
	});
	await attachReviewAndScore(args.prisma, {
		applicationId: approvedApp.id,
		countyId: args.countyId,
		wardAdminId: args.wardAdminId,
		financeOfficerId: args.financeOfficerId,
		recommendedAmount: 32000,
		allocatedAmount: 30000,
		totalScore: 73.2,
	});

	const rejectedApp = await createApplication(args.prisma, {
		countyId: args.countyId,
		wardId: args.wardId,
		programId: programB.id,
		applicantId: studentC,
		status: 'REJECTED',
		amountAllocated: 0,
		reference: `B06-R-${Date.now()}`,
	});
	await attachReviewAndScore(args.prisma, {
		applicationId: rejectedApp.id,
		countyId: args.countyId,
		wardAdminId: args.wardAdminId,
		financeOfficerId: args.financeOfficerId,
		recommendedAmount: 0,
		allocatedAmount: 0,
		totalScore: 41.4,
	});

	return { programAId: programA.id, programBId: programB.id, wardId: args.wardId };
}

export function signReportingToken(jwtService: JwtService, user: { id: string; email: string; role: UserRole; countyId: string; wardId: string | null }) {
	return jwtService.sign({
		sub: user.id,
		email: user.email,
		role: user.role,
		countyId: user.countyId,
		wardId: user.wardId,
	});
}

async function createStudent(prisma: PrismaClient, countyId: string, wardId: string, institutionType: string): Promise<string> {
	const user = await prisma.user.create({
		data: {
			countyId,
			wardId,
			email: `b06-student-${Date.now()}-${Math.random()}@example.com`,
			passwordHash: 'hashed-password',
			role: UserRole.STUDENT,
			emailVerified: true,
			phoneVerified: true,
		},
	});
	await prisma.studentProfile.create({ data: { userId: user.id, countyId, fullName: `Reporting Student ${Date.now()}`, phone: '+254700111222' } });
	await prisma.academicInfo.create({ data: { userId: user.id, countyId, institutionType, institutionName: `${institutionType} Institute` } });
	await prisma.familyFinancialInfo.create({ data: { userId: user.id, countyId, familyStatus: 'NEEDY' } });
	return user.id;
}

async function createApplication(prisma: PrismaClient, data: { countyId: string; wardId: string; programId: string; applicantId: string; status: 'DISBURSED' | 'APPROVED' | 'REJECTED'; amountAllocated: number; reference: string }) {
	return prisma.application.create({
		data: {
			countyId: data.countyId,
			wardId: data.wardId,
			programId: data.programId,
			applicantId: data.applicantId,
			status: data.status,
			amountAllocated: data.amountAllocated,
			submissionReference: data.reference,
			submittedAt: new Date(),
		},
	});
}

async function attachReviewAndScore(prisma: PrismaClient, data: { applicationId: string; countyId: string; wardAdminId: string; financeOfficerId: string; recommendedAmount: number; allocatedAmount: number; totalScore: number }) {
	await prisma.applicationReview.create({ data: { applicationId: data.applicationId, countyId: data.countyId, reviewerId: data.wardAdminId, stage: 'WARD_REVIEW', decision: data.recommendedAmount > 0 ? 'RECOMMENDED' : 'REJECTED', recommendedAmount: data.recommendedAmount, note: 'Ward review completed' } });
	await prisma.applicationReview.create({ data: { applicationId: data.applicationId, countyId: data.countyId, reviewerId: data.financeOfficerId, stage: 'COUNTY_REVIEW', decision: data.allocatedAmount > 0 ? 'APPROVED' : 'REJECTED', allocatedAmount: data.allocatedAmount, note: 'County review completed' } });
	await prisma.aIScoreCard.create({ data: { applicationId: data.applicationId, countyId: data.countyId, totalScore: data.totalScore, familyStatusScore: 20, familyIncomeScore: 18, educationBurdenScore: 15, academicStandingScore: 12, documentQualityScore: 8, integrityScore: 5, anomalyFlags: [], documentAnalysis: {}, modelVersion: 'b06-fixture', weightsApplied: { family_status: 0.25, family_income: 0.25, education_burden: 0.2, academic_standing: 0.1, document_quality: 0.1, integrity: 0.1 } } });
}
