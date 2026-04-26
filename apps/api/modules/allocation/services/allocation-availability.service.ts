/**
 * Purpose: Determine whether the VILLAGE_ADMIN of a given village_unit is "available"
 *          per the override-hierarchy semantics defined in §7.4 of the design doc.
 * Why important: This service is the single source of truth that StudentAllocationService
 *                consults to decide whether a non-village actor (Ward / County / Finance)
 *                may invoke an override path. It is also queried directly by reporting
 *                surfaces and the OCOB override-summary aggregate.
 * Used by: StudentAllocationService.allocate, allocation override audit, OCOB reports.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
	OverrideReasonCode,
	VillageAdminAvailability,
} from '../dto/allocation-actor.types';

@Injectable()
export class AllocationAvailabilityService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Compute the current availability of the village admin for a given village_unit
	 * within a given allocation cycle. The tx parameter, when provided, is the
	 * transaction-scoped Prisma client so the check happens inside the same
	 * SERIALIZABLE transaction that performs the allocation write — preventing
	 * a TOCTOU race between availability check and override write.
	 *
	 * @param countyId    - tenant scope; used for defense-in-depth filtering.
	 * @param villageUnitId - the village whose admin we are evaluating.
	 * @param programId   - the bursary program; used to look up village_allocation_due_at.
	 * @param now         - injectable clock; defaults to new Date().
	 * @param tx          - optional transaction client; falls back to this.prisma.
	 */
	async resolveAvailability(
		countyId: string,
		villageUnitId: string,
		programId: string,
		now: Date = new Date(),
		tx?: Prisma.TransactionClient,
	): Promise<VillageAdminAvailability> {
		const client = tx ?? this.prisma;

		const [activeAssignment, villageAllocation] = await Promise.all([
			client.villageAdminAssignment.findFirst({
				where: { villageUnitId, countyId },
				orderBy: [{ isActive: 'desc' }, { assignedAt: 'desc' }],
				select: {
					userId: true,
					isActive: true,
					unavailableUntil: true,
					unavailableReason: true,
					user: { select: { isActive: true, deletedAt: true } },
				},
			}),
			client.villageBudgetAllocation.findFirst({
				where: { villageUnitId, programId, countyId },
				select: { villageAllocationDueAt: true },
			}),
		]);

		const allocationDueAt = villageAllocation?.villageAllocationDueAt ?? null;

		// 1. No assignment row at all → vacant.
		if (!activeAssignment) {
			return {
				isAvailable: false,
				activeAdminId: null,
				unavailableReason: OverrideReasonCode.VILLAGE_ADMIN_VACANT,
				unavailableContext: 'No VILLAGE_ADMIN assignment exists for this village_unit.',
				allocationDueAt,
			};
		}

		// 2. Assignment exists but is_active=false OR underlying user soft-deleted/inactive → inactive.
		const userActive = activeAssignment.user.isActive && !activeAssignment.user.deletedAt;
		if (!activeAssignment.isActive || !userActive) {
			return {
				isAvailable: false,
				activeAdminId: activeAssignment.userId,
				unavailableReason: OverrideReasonCode.VILLAGE_ADMIN_INACTIVE,
				unavailableContext:
					activeAssignment.unavailableReason ?? 'Village admin assignment is not active.',
				allocationDueAt,
			};
		}

		// 3. Explicit temporary unavailability (set by County Admin).
		if (activeAssignment.unavailableUntil && activeAssignment.unavailableUntil > now) {
			return {
				isAvailable: false,
				activeAdminId: activeAssignment.userId,
				unavailableReason: OverrideReasonCode.EXPLICITLY_DELEGATED,
				unavailableContext: activeAssignment.unavailableReason ?? null,
				allocationDueAt,
			};
		}

		// 4. Allocation deadline passed without action → deadline-missed override permitted.
		if (allocationDueAt && allocationDueAt < now) {
			return {
				isAvailable: false,
				activeAdminId: activeAssignment.userId,
				unavailableReason: OverrideReasonCode.VILLAGE_DEADLINE_MISSED,
				unavailableContext: `Village allocation deadline ${allocationDueAt.toISOString()} elapsed.`,
				allocationDueAt,
			};
		}

		// 5. Otherwise: available.
		return {
			isAvailable: true,
			activeAdminId: activeAssignment.userId,
			allocationDueAt,
		};
	}
}
