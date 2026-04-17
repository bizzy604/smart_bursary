/**
 * Purpose: Share setup helpers for the P5 review and AI workflow test.
 * Why important: Keeps the main e2e spec under the file-size governance limit.
 * Used by: review-ai.e2e-spec.ts only.
 */
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserRole } from '@prisma/client';

export type ReviewWorkflowSeed = {
	countyId: string;
	wardId: string;
	programId: string;
	studentToken: string;
	wardAdminToken: string;
	countyAdminToken: string;
	financeOfficerToken: string;
};

type SeedArgs = {
	prisma: PrismaClient;
	jwtService: JwtService;
	countySlug: string;
};

export async function seedReviewWorkflow(args: SeedArgs): Promise<ReviewWorkflowSeed> {
	const county = await args.prisma.county.findUniqueOrThrow({ where: { slug: args.countySlug } });
	let ward = await args.prisma.ward.findFirst({ where: { countyId: county.id } });
	if (!ward) {
		ward = await args.prisma.ward.create({
			data: { countyId: county.id, name: 'Central Ward', code: 'CENT-001' },
		});
	}

	const student = await createUser(args.prisma, county.id, ward.id, UserRole.STUDENT, 'student');
	const wardAdmin = await createUser(args.prisma, county.id, ward.id, UserRole.WARD_ADMIN, 'ward-admin');
	const countyAdmin = await createUser(args.prisma, county.id, null, UserRole.COUNTY_ADMIN, 'county-admin');
	const financeOfficer = await createUser(args.prisma, county.id, null, UserRole.FINANCE_OFFICER, 'finance');

	const program = await args.prisma.bursaryProgram.create({
		data: {
			countyId: county.id,
			wardId: ward.id,
			name: 'Review P5 Program',
			description: 'Program for review workflow tests',
			budgetCeiling: 100000,
			opensAt: new Date(),
			closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			academicYear: '2026',
			status: 'ACTIVE',
			createdBy: countyAdmin.id,
		},
	});

	await markStudentSubmissionReady(args.prisma, county.id, student.id);

	return {
		countyId: county.id,
		wardId: ward.id,
		programId: program.id,
		studentToken: signToken(args.jwtService, student),
		wardAdminToken: signToken(args.jwtService, wardAdmin),
		countyAdminToken: signToken(args.jwtService, countyAdmin),
		financeOfficerToken: signToken(args.jwtService, financeOfficer),
	};
}

async function createUser(
	prisma: PrismaClient,
	countyId: string,
	wardId: string | null,
	role: UserRole,
	prefix: string,
) {
	return prisma.user.create({
		data: {
			countyId,
			wardId,
			email: `${prefix}-${Date.now()}@example.com`,
			passwordHash: 'hashed-password',
			role,
		},
	});
}

function signToken(jwtService: JwtService, user: { id: string; email: string; role: UserRole; countyId: string; wardId: string | null; }) {
	return jwtService.sign({
		sub: user.id,
		email: user.email,
		role: user.role,
		countyId: user.countyId,
		wardId: user.wardId,
	});
}

async function markStudentSubmissionReady(
	prisma: PrismaClient,
	countyId: string,
	studentId: string,
) {
	await prisma.user.update({
		where: { id: studentId },
		data: {
			emailVerified: true,
			phoneVerified: true,
		},
	});

	await prisma.studentProfile.upsert({
		where: { userId: studentId },
		update: {
			fullName: 'Review Workflow Student',
			phone: '+254700000333',
		},
		create: {
			userId: studentId,
			countyId,
			fullName: 'Review Workflow Student',
			phone: '+254700000333',
		},
	});

	await prisma.academicInfo.upsert({
		where: { userId: studentId },
		update: {
			institutionType: 'UNIVERSITY',
			institutionName: 'Turkana Technical University',
		},
		create: {
			userId: studentId,
			countyId,
			institutionType: 'UNIVERSITY',
			institutionName: 'Turkana Technical University',
		},
	});

	await prisma.familyFinancialInfo.upsert({
		where: { userId: studentId },
		update: {
			familyStatus: 'TWO_PARENTS',
		},
		create: {
			userId: studentId,
			countyId,
			familyStatus: 'TWO_PARENTS',
		},
	});
}
