/**
 * Purpose: Reusable fixtures for allocation-flow integration tests (Commit 2 of §7).
 * Why important: Keeps the e2e spec under file-size limits and centralises tenant + ward +
 *                village + applicant scaffolding for the money-integrity flow.
 * Used by: allocation.e2e-spec.ts.
 */
import { JwtService } from '@nestjs/jwt';
import {
	ApplicationStatus,
	PrismaClient,
	UserRole,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export type AllocationFixtureContext = {
	countyId: string;
	wardId: string;
	subCountyId: string;
	villageUnitId: string;
	emptyVillageUnitId: string; // village without an admin assignment for override tests
	countyAdminId: string;
	financeOfficerId: string;
	wardAdminId: string;
	villageAdminId: string;
	otherUserId: string; // a different user used as fake village admin for negative tests
	studentIds: string[];
	programId: string;
	applicationIds: string[];
	tokens: {
		countyAdmin: string;
		financeOfficer: string;
		wardAdmin: string;
		villageAdmin: string;
		other: string;
	};
};

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

const PRISMA_CLIENT = new PrismaClient();

/**
 * Creates a fully-isolated allocation-flow fixture: a fresh ward + sub-county + 2 villages
 * (one with a village admin, one without) + 3 students with applications in WARD_REVIEW.
 * Re-runs are safe: each call creates new rows with unique codes.
 */
export async function createAllocationFixture(args: {
	prisma: PrismaService;
	jwtService: JwtService;
	countyId: string;
}): Promise<AllocationFixtureContext> {
	const { prisma, jwtService, countyId } = args;
	const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
	// VARCHAR(20) ceilings on SubCounty.code and Ward.code force a short suffix
	// (the longer `unique` is fine for names where the limit is 120 chars).
	const shortSuffix = Math.random().toString(36).slice(2, 12); // 10 base36 chars

	// ─── geographic scaffolding ───
	const subCounty = await prisma.subCounty.create({
		data: {
			countyId,
			name: `Test Sub-County ${unique}`,
			code: `TSC-${shortSuffix}`,
			isActive: true,
		},
	});

	const ward = await prisma.ward.create({
		data: {
			countyId,
			name: `Test Ward ${unique}`,
			code: `TW-${shortSuffix}`,
			subCountyId: subCounty.id,
			isActive: true,
		},
	});

	const villageWithAdmin = await prisma.villageUnit.create({
		data: {
			countyId,
			wardId: ward.id,
			name: `Village With Admin ${unique}`,
			code: `VWA-${unique}`,
			isActive: true,
		},
	});

	const villageWithoutAdmin = await prisma.villageUnit.create({
		data: {
			countyId,
			wardId: ward.id,
			name: `Village Without Admin ${unique}`,
			code: `VWOA-${unique}`,
			isActive: true,
		},
	});

	// ─── users ───
	const [countyAdmin, financeOfficer, wardAdmin, villageAdmin, otherUser] = await Promise.all([
		prisma.user.create({
			data: { countyId, email: `county-${unique}@test.local`, passwordHash: 'h', role: UserRole.COUNTY_ADMIN, emailVerified: true, phoneVerified: true },
		}),
		prisma.user.create({
			data: { countyId, email: `finance-${unique}@test.local`, passwordHash: 'h', role: UserRole.FINANCE_OFFICER, emailVerified: true, phoneVerified: true },
		}),
		prisma.user.create({
			data: { countyId, wardId: ward.id, email: `ward-${unique}@test.local`, passwordHash: 'h', role: UserRole.WARD_ADMIN, emailVerified: true, phoneVerified: true },
		}),
		prisma.user.create({
			data: { countyId, wardId: ward.id, email: `village-${unique}@test.local`, passwordHash: 'h', role: UserRole.VILLAGE_ADMIN, emailVerified: true, phoneVerified: true },
		}),
		prisma.user.create({
			data: { countyId, email: `other-${unique}@test.local`, passwordHash: 'h', role: UserRole.STUDENT, emailVerified: true, phoneVerified: true },
		}),
	]);

	await prisma.villageAdminAssignment.create({
		data: { countyId, villageUnitId: villageWithAdmin.id, userId: villageAdmin.id, isActive: true },
	});

	// ─── students + applications + program ───
	const program = await prisma.bursaryProgram.create({
		data: {
			countyId,
			wardId: ward.id,
			name: `Allocation Test Program ${unique}`,
			description: 'Allocation flow integration test',
			budgetCeiling: 10_000_000,
			opensAt: new Date(),
			closesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			academicYear: '2026',
			status: 'ACTIVE',
			createdBy: countyAdmin.id,
		},
	});

	const studentIds: string[] = [];
	const applicationIds: string[] = [];
	for (let i = 0; i < 3; i++) {
		const student = await prisma.user.create({
			data: {
				countyId,
				wardId: ward.id,
				email: `student-${i}-${unique}@test.local`,
				passwordHash: 'h',
				role: UserRole.STUDENT,
				emailVerified: true,
				phoneVerified: true,
			},
		});
		await prisma.studentProfile.create({
			data: {
				userId: student.id,
				countyId,
				fullName: `Student ${i} ${unique}`,
				villageUnitId: villageWithAdmin.id,
				profileComplete: true,
			},
		});
		const app = await prisma.application.create({
			data: {
				countyId,
				applicantId: student.id,
				programId: program.id,
				wardId: ward.id,
				status: ApplicationStatus.WARD_REVIEW,
				amountRequested: 50_000,
				submissionReference: `APP-${unique}-${i}`,
				submittedAt: new Date(),
			},
		});
		studentIds.push(student.id);
		applicationIds.push(app.id);
	}

	return {
		countyId,
		wardId: ward.id,
		subCountyId: subCounty.id,
		villageUnitId: villageWithAdmin.id,
		emptyVillageUnitId: villageWithoutAdmin.id,
		countyAdminId: countyAdmin.id,
		financeOfficerId: financeOfficer.id,
		wardAdminId: wardAdmin.id,
		villageAdminId: villageAdmin.id,
		otherUserId: otherUser.id,
		studentIds,
		programId: program.id,
		applicationIds,
		tokens: {
			countyAdmin: signToken(jwtService, countyAdmin),
			financeOfficer: signToken(jwtService, financeOfficer),
			wardAdmin: signToken(jwtService, wardAdmin),
			villageAdmin: signToken(jwtService, villageAdmin),
			other: signToken(jwtService, otherUser),
		},
	};
}

// keep prisma client suppressed warning friendly
void PRISMA_CLIENT;
