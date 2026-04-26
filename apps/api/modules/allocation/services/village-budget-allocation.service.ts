/**
 * Purpose: Implement Stage 3 of the money-integrity flow — Ward → Village pool distribution.
 * Why important: Enforces Invariant 2 (Σ(village_pools_in_ward) ≤ ward.allocated_kes) atomically
 *                under nested program → ward advisory locks. Provides the proportional default
 *                computation matching the user-stated practice ("students with high number get
 *                more share") that the UI uses as a starting point before manual adjustment.
 * Used by: AllocationController.distributeWardToVillages, OCOB ward-summary report.
 */
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, DistributionMethod, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { DistributeVillageAllocationsDto } from '../dto/distribute-village-allocations.dto';

const PENNY_TOLERANCE_KES = 0.01;

@Injectable()
export class VillageBudgetAllocationService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Compute the proportional suggestion for a ward, returning per-village pool
	 * recommendations weighted by the count of applicants per village within the
	 * program's ward whose status is in the post-eligibility pipeline.
	 *
	 * The result is a pure read; no writes occur.
	 */
	async computeProportionalSuggestion(countyId: string, wardAllocationId: string) {
		const wardAllocation = await this.prisma.wardBudgetAllocation.findFirst({
			where: { id: wardAllocationId, countyId },
			select: {
				id: true,
				wardId: true,
				programId: true,
				allocatedKes: true,
				ward: { select: { name: true } },
			},
		});
		if (!wardAllocation) {
			throw new NotFoundException('Ward allocation not found.');
		}

		const villages = await this.prisma.villageUnit.findMany({
			where: { wardId: wardAllocation.wardId, countyId, isActive: true },
			select: { id: true, name: true, code: true },
			orderBy: { name: 'asc' },
		});

		// Per-village applicant counts: applications belonging to this ward + program,
		// joined to student_profiles.village_unit_id (Phase 0 backfilled).
		const applicantsPerVillage = await this.prisma.application.groupBy({
			by: ['applicantId'],
			where: {
				countyId,
				programId: wardAllocation.programId,
				wardId: wardAllocation.wardId,
				status: {
					in: [
						ApplicationStatus.SUBMITTED,
						ApplicationStatus.WARD_REVIEW,
						ApplicationStatus.WARD_DISTRIBUTION_PENDING,
						ApplicationStatus.VILLAGE_ALLOCATION_PENDING,
					],
				},
			},
			_count: { _all: true },
		});

		const profiles = await this.prisma.studentProfile.findMany({
			where: {
				userId: { in: applicantsPerVillage.map((row) => row.applicantId) },
			},
			select: { userId: true, villageUnitId: true },
		});
		const profileByUser = new Map(profiles.map((p) => [p.userId, p.villageUnitId]));

		const counts: Record<string, number> = {};
		for (const village of villages) counts[village.id] = 0;
		for (const row of applicantsPerVillage) {
			const villageId = profileByUser.get(row.applicantId);
			if (villageId && counts[villageId] !== undefined) counts[villageId] += 1;
		}

		const totalApplicants = Object.values(counts).reduce((sum, n) => sum + n, 0);
		const wardPoolKes = Number(wardAllocation.allocatedKes);

		const suggestions = villages.map((village) => {
			const applicantCount = counts[village.id];
			const share =
				totalApplicants === 0 ? 0 : (applicantCount / totalApplicants) * wardPoolKes;
			return {
				villageUnitId: village.id,
				villageName: village.name,
				villageCode: village.code,
				applicantCount,
				suggestedAllocatedKes: Math.round(share * 100) / 100,
			};
		});

		return {
			wardAllocationId,
			wardName: wardAllocation.ward.name,
			wardPoolKes,
			totalApplicants,
			distributionMethod: DistributionMethod.PROPORTIONAL,
			suggestions,
		};
	}

	/**
	 * Persist the ward → village distribution. Enforces Σ(village_pools) == ward_pool
	 * (Invariant 2) and updates the parent ward's allocated_total_kes inside a SERIALIZABLE
	 * transaction with nested advisory locks: program → ward.
	 */
	async distribute(
		countyId: string,
		actorId: string,
		actorWardId: string | null,
		wardAllocationId: string,
		dto: DistributeVillageAllocationsDto,
	) {
		try {
			return await this.prisma.$transaction(
				async (tx) => {
					const wardAllocation = await tx.wardBudgetAllocation.findFirst({
						where: { id: wardAllocationId, countyId },
						select: {
							id: true,
							programId: true,
							wardId: true,
							allocatedKes: true,
						},
					});
					if (!wardAllocation) {
						throw new NotFoundException('Ward allocation not found.');
					}

					// Ward admins can only distribute their own ward; county/finance can do any.
					if (actorWardId !== null && actorWardId !== wardAllocation.wardId) {
						throw new ForbiddenException(
							'Ward admins can only distribute allocations for their own ward.',
						);
					}

					// Acquire nested locks: program → ward.
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${wardAllocation.programId}), 0)`;
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ward:' + wardAllocation.programId + ':' + wardAllocation.wardId}), 0)`;

					const wardPool = Number(wardAllocation.allocatedKes);
					const sumProposed = dto.villageAllocations.reduce(
						(sum, entry) => sum + entry.allocatedKes,
						0,
					);

					if (Math.abs(sumProposed - wardPool) > PENNY_TOLERANCE_KES) {
						throw new BadRequestException(
							`Σ(village_pools)=${sumProposed} must equal ward_pool=${wardPool} (Invariant 2).`,
						);
					}

					// All declared villages must belong to the ward.
					const villageIds = dto.villageAllocations.map((entry) => entry.villageUnitId);
					const validVillages = await tx.villageUnit.findMany({
						where: {
							id: { in: villageIds },
							wardId: wardAllocation.wardId,
							countyId,
						},
						select: { id: true },
					});
					if (validVillages.length !== villageIds.length) {
						throw new BadRequestException(
							'One or more village_unit_id values do not belong to this ward.',
						);
					}

					const dueAt = dto.villageAllocationDueAt
						? new Date(dto.villageAllocationDueAt)
						: null;

					// Upsert each village_budget_allocation; aggregate result for the response.
					const persisted = [];
					for (const entry of dto.villageAllocations) {
						const upserted = await tx.villageBudgetAllocation.upsert({
							where: {
								idx_village_alloc_program_village_unique: {
									programId: wardAllocation.programId,
									villageUnitId: entry.villageUnitId,
								},
							},
							create: {
								countyId,
								programId: wardAllocation.programId,
								wardBudgetAllocationId: wardAllocation.id,
								wardId: wardAllocation.wardId,
								villageUnitId: entry.villageUnitId,
								allocatedKes: entry.allocatedKes,
								applicantCountAtDistribution: entry.applicantCountAtDistribution ?? 0,
								distributionMethod: dto.distributionMethod,
								villageAllocationDueAt: dueAt,
								createdBy: actorId,
							},
							update: {
								allocatedKes: entry.allocatedKes,
								applicantCountAtDistribution:
									entry.applicantCountAtDistribution ?? undefined,
								distributionMethod: dto.distributionMethod,
								villageAllocationDueAt: dueAt,
							},
							select: {
								id: true,
								villageUnitId: true,
								allocatedKes: true,
								allocatedTotalKes: true,
								disbursedTotalKes: true,
								villageAllocationDueAt: true,
							},
						});
						persisted.push(upserted);
					}

					// Update parent ward.allocated_total_kes to the new sum.
					await tx.wardBudgetAllocation.update({
						where: { id: wardAllocation.id },
						data: { allocatedTotalKes: sumProposed },
					});

					// Status-machine transition (Commit 3): every application whose applicant lives
					// in one of the distributed villages and whose status is in the pre-allocation
					// pipeline graduates to VILLAGE_ALLOCATION_PENDING. We also stamp the village
					// + ward allocation FKs onto the application so subsequent StudentAllocationService
					// calls don't have to re-resolve the village from the applicant profile.
					const persistedByVillage = new Map(
						persisted.map((row) => [row.villageUnitId, row]),
					);

					const candidateApps = await tx.application.findMany({
						where: {
							countyId,
							programId: wardAllocation.programId,
							wardId: wardAllocation.wardId,
							status: {
								in: [
									ApplicationStatus.SUBMITTED,
									ApplicationStatus.WARD_REVIEW,
									ApplicationStatus.WARD_DISTRIBUTION_PENDING,
								],
							},
							applicant: { profile: { villageUnitId: { in: villageIds } } },
						},
						select: {
							id: true,
							status: true,
							applicant: { select: { profile: { select: { villageUnitId: true } } } },
						},
					});

					let transitionedCount = 0;
					for (const app of candidateApps) {
						const villageId = app.applicant.profile?.villageUnitId;
						if (!villageId) continue;
						const villageAlloc = persistedByVillage.get(villageId);
						if (!villageAlloc) continue;

						await tx.application.update({
							where: { id: app.id },
							data: {
								status: ApplicationStatus.VILLAGE_ALLOCATION_PENDING,
								villageBudgetAllocationId: villageAlloc.id,
								wardBudgetAllocationId: wardAllocation.id,
							},
						});

						await tx.applicationTimeline.create({
							data: {
								applicationId: app.id,
								countyId,
								actorId,
								eventType: 'VILLAGE_ALLOCATION_PENDING',
								fromStatus: app.status,
								toStatus: ApplicationStatus.VILLAGE_ALLOCATION_PENDING,
								metadata: {
									wardBudgetAllocationId: wardAllocation.id,
									villageBudgetAllocationId: villageAlloc.id,
									villageUnitId: villageId,
									villagePoolKes: Number(villageAlloc.allocatedKes),
									villageAllocationDueAt: dueAt?.toISOString() ?? null,
									distributionMethod: dto.distributionMethod,
									note: dto.note ?? null,
								} as Prisma.InputJsonValue,
							},
						});
						transitionedCount += 1;
					}

					return {
						wardAllocationId: wardAllocation.id,
						wardPoolKes: wardPool,
						totalDistributed: sumProposed,
						villageAllocations: persisted,
						distributionMethod: dto.distributionMethod,
						villageAllocationDueAt: dueAt,
						applicationsTransitioned: transitionedCount,
					};
				},
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
			);
		} catch (error: unknown) {
			const prismaError = error as { code?: string };
			if (prismaError.code === 'P2034') {
				throw new ConflictException('Concurrent village distribution detected. Please retry.');
			}
			throw error;
		}
	}

	/**
	 * Read all village allocations for a ward allocation, including remaining capacity
	 * for each village pool.
	 */
	async listByWardAllocation(countyId: string, wardAllocationId: string) {
		const wardAllocation = await this.prisma.wardBudgetAllocation.findFirst({
			where: { id: wardAllocationId, countyId },
			select: { id: true, wardId: true, allocatedKes: true, allocatedTotalKes: true },
		});
		if (!wardAllocation) {
			throw new NotFoundException('Ward allocation not found.');
		}

		const villages = await this.prisma.villageBudgetAllocation.findMany({
			where: { wardBudgetAllocationId: wardAllocationId, countyId },
			orderBy: { createdAt: 'asc' },
			select: {
				id: true,
				villageUnitId: true,
				allocatedKes: true,
				allocatedTotalKes: true,
				disbursedTotalKes: true,
				applicantCountAtDistribution: true,
				distributionMethod: true,
				villageAllocationDueAt: true,
				villageUnit: { select: { name: true, code: true } },
			},
		});

		return {
			wardAllocationId,
			wardPoolKes: Number(wardAllocation.allocatedKes),
			totalDistributed: Number(wardAllocation.allocatedTotalKes),
			remainingToDistribute:
				Number(wardAllocation.allocatedKes) - Number(wardAllocation.allocatedTotalKes),
			villages,
		};
	}
}
