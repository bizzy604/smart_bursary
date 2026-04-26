/**
 * Purpose: Implement Stage 4 of the money-integrity flow — Village → Student final allocation.
 * Why important: This service is the integrity anchor. It (a) enforces Invariant 3 atomically
 *                under nested 3-level advisory locks, (b) determines the allocation actor's tier
 *                in the override hierarchy from their role, (c) consults AllocationAvailabilityService
 *                to ensure non-village actors only act when the village admin is structurally
 *                unavailable, (d) writes both the allocation update and the immutable timeline
 *                audit entry in a SERIALIZABLE transaction.
 * Used by: AllocationController.allocateToStudent.
 */
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	AllocationActorTier,
	ApplicationStatus,
	Prisma,
	UserRole,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { NotificationLifecycleService } from '../../notification/notification-lifecycle.service';
import { AllocateToStudentDto } from '../dto/allocate-to-student.dto';
import {
	OverrideReasonCode,
	VillageAdminAvailability,
} from '../dto/allocation-actor.types';
import { AllocationAvailabilityService } from './allocation-availability.service';

const ROLE_TO_TIER: Partial<Record<UserRole, AllocationActorTier>> = {
	[UserRole.VILLAGE_ADMIN]: AllocationActorTier.VILLAGE,
	[UserRole.WARD_ADMIN]: AllocationActorTier.WARD,
	[UserRole.COUNTY_ADMIN]: AllocationActorTier.COUNTY,
	[UserRole.FINANCE_OFFICER]: AllocationActorTier.FINANCE,
};

@Injectable()
export class StudentAllocationService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly availabilityService: AllocationAvailabilityService,
		private readonly notificationLifecycleService: NotificationLifecycleService,
	) {}

	/**
	 * Allocate a final amount to a student application. Encapsulates the entire
	 * §7 money-integrity contract: lock → invariant check → write → audit.
	 */
	async allocate(
		countyId: string,
		actor: { userId: string; role: UserRole; wardId: string | null },
		applicationId: string,
		dto: AllocateToStudentDto,
	) {
		const tier = ROLE_TO_TIER[actor.role];
		if (!tier) {
			throw new ForbiddenException(
				`Role ${actor.role} is not permitted to make student allocations.`,
			);
		}

		try {
			const result = await this.prisma.$transaction(
				async (tx) => {
					// Load application with the village pool that funds it. Application must already
					// have a village_budget_allocation_id assigned by the prior ward distribution step.
					const application = await tx.application.findFirst({
						where: { id: applicationId, countyId },
						select: {
							id: true,
							status: true,
							programId: true,
							wardId: true,
							applicantId: true,
							amountAllocated: true,
							amountRequested: true,
							villageBudgetAllocationId: true,
							wardBudgetAllocationId: true,
							applicant: {
								select: {
									profile: { select: { villageUnitId: true } },
								},
							},
						},
					});
					if (!application) {
						throw new NotFoundException('Application not found in this county.');
					}

					// Resolve the village_unit_id: prefer the village allocation; fall back to applicant profile.
					let villageUnitId: string | null = null;
					let villageBudgetAllocationId = application.villageBudgetAllocationId;
					let wardBudgetAllocationId = application.wardBudgetAllocationId;

					if (villageBudgetAllocationId) {
						const villageAlloc = await tx.villageBudgetAllocation.findUnique({
							where: { id: villageBudgetAllocationId },
							select: {
								id: true,
								villageUnitId: true,
								wardBudgetAllocationId: true,
							},
						});
						if (!villageAlloc) {
							throw new BadRequestException(
								'Application links to a missing village allocation. Re-run ward distribution.',
							);
						}
						villageUnitId = villageAlloc.villageUnitId;
						wardBudgetAllocationId = villageAlloc.wardBudgetAllocationId;
					} else {
						villageUnitId = application.applicant.profile?.villageUnitId ?? null;
					}

					if (!villageUnitId) {
						throw new BadRequestException(
							'Cannot allocate: applicant has no village_unit_id. Backfill profile or run ward distribution first.',
						);
					}

					// 3-level advisory locks: program → ward → village (deterministic order).
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${application.programId}), 0)`;
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ward:' + application.programId + ':' + application.wardId}), 0)`;
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'village:' + application.programId + ':' + villageUnitId}), 0)`;

					// Authorize tier vs. availability.
					const availability = await this.availabilityService.resolveAvailability(
						countyId,
						villageUnitId,
						application.programId,
						new Date(),
						tx,
					);

					this.authorizeAllocationActor(tier, actor, application.wardId, availability, dto);

					// Resolve the village_budget_allocation row that funds this allocation.
					const villageAllocation = villageBudgetAllocationId
						? await tx.villageBudgetAllocation.findUnique({
								where: { id: villageBudgetAllocationId },
								select: {
									id: true,
									wardBudgetAllocationId: true,
									allocatedKes: true,
									allocatedTotalKes: true,
								},
							})
						: await tx.villageBudgetAllocation.findFirst({
								where: {
									programId: application.programId,
									villageUnitId,
									countyId,
								},
								select: {
									id: true,
									wardBudgetAllocationId: true,
									allocatedKes: true,
									allocatedTotalKes: true,
								},
							});

					if (!villageAllocation) {
						throw new BadRequestException(
							'No village_budget_allocation exists for this village in this program. Ward must distribute first.',
						);
					}

					// Invariant 3: village.allocated_total_kes − this_app's_existing + new ≤ village.allocated_kes.
					const villagePoolKes = Number(villageAllocation.allocatedKes);
					const villageAlreadyAllocated = Number(villageAllocation.allocatedTotalKes);
					const previousAppAllocation = Number(application.amountAllocated ?? 0);
					const newRunningTotal =
						villageAlreadyAllocated - previousAppAllocation + dto.amountKes;

					if (newRunningTotal > villagePoolKes + 0.01) {
						throw new ConflictException(
							`Allocation exceeds village pool. Remaining capacity: ${villagePoolKes - (villageAlreadyAllocated - previousAppAllocation)} KES (Invariant 3).`,
						);
					}

					// Persist application allocation.
					const updatedApp = await tx.application.update({
						where: { id: applicationId },
						data: {
							amountAllocated: dto.amountKes,
							status: ApplicationStatus.ALLOCATED,
							allocatedAt: new Date(),
							villageBudgetAllocationId: villageAllocation.id,
							wardBudgetAllocationId: villageAllocation.wardBudgetAllocationId,
							allocationActorId: actor.userId,
							allocationActorTier: tier,
						},
						select: { id: true, status: true, amountAllocated: true, allocatedAt: true },
					});

					// Update village pool running total.
					await tx.villageBudgetAllocation.update({
						where: { id: villageAllocation.id },
						data: { allocatedTotalKes: newRunningTotal },
					});

					// Insert immutable timeline audit row.
					const isOverride = tier !== AllocationActorTier.VILLAGE;
					const eventType = isOverride ? 'ALLOCATION_OVERRIDE' : 'ALLOCATED';
					const metadata: Record<string, unknown> = {
						amountKes: dto.amountKes,
						actorTier: tier,
						villageBudgetAllocationId: villageAllocation.id,
						wardBudgetAllocationId: villageAllocation.wardBudgetAllocationId,
					};
					if (dto.note) metadata.note = dto.note;
					if (isOverride) {
						metadata.overrideTier = tier;
						metadata.originalVillageAdminId = availability.activeAdminId;
						metadata.overrideReasonCode = dto.overrideReasonCode ?? availability.unavailableReason;
						metadata.overrideReasonNote = dto.overrideReasonNote ?? null;
						metadata.systemDetectedReason = availability.unavailableReason;
						metadata.systemDetectedContext = availability.unavailableContext ?? null;
					}

					await tx.applicationTimeline.create({
						data: {
							applicationId,
							countyId,
							actorId: actor.userId,
							eventType,
							fromStatus: application.status,
							toStatus: ApplicationStatus.ALLOCATED,
							metadata: metadata as Prisma.InputJsonValue,
						},
					});

					return {
						application: updatedApp,
						villageBudgetAllocationId: villageAllocation.id,
						wardBudgetAllocationId: villageAllocation.wardBudgetAllocationId,
						actorTier: tier,
						isOverride,
						villagePoolRemaining: villagePoolKes - newRunningTotal,
						eventType,
						auditMetadata: metadata,
					};
				},
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
			);

			// Notify outside the transaction (best-effort). Mirrors CountyReviewService pattern.
			await this.notificationLifecycleService.queueStatusChange({
				countyId,
				applicationId,
				eventType: result.eventType,
				fromStatus: ApplicationStatus.VILLAGE_ALLOCATION_PENDING,
				toStatus: ApplicationStatus.ALLOCATED,
				metadata: {
					amountKes: result.application.amountAllocated,
					actorTier: result.actorTier,
					isOverride: result.isOverride,
				},
			});

			return result;
		} catch (error: unknown) {
			const prismaError = error as { code?: string };
			if (prismaError.code === 'P2034') {
				throw new ConflictException('Concurrent allocation detected. Please retry.');
			}
			throw error;
		}
	}

	/**
	 * Encapsulate the "who can act" decision.
	 *  - VILLAGE tier: must be the actively-assigned admin for this village_unit.
	 *  - WARD tier: must own the ward AND village admin must be unavailable.
	 *  - COUNTY / FINANCE tier: village admin must be unavailable; for FINANCE, the
	 *    ward admin's silence is implied by the same availability detector applied
	 *    upstream — for now we only gate on village admin availability and require
	 *    the override code to match the system-detected reason.
	 */
	private authorizeAllocationActor(
		tier: AllocationActorTier,
		actor: { userId: string; wardId: string | null },
		applicationWardId: string,
		availability: VillageAdminAvailability,
		dto: AllocateToStudentDto,
	): void {
		// Village admin must be the assigned admin for THIS village.
		if (tier === AllocationActorTier.VILLAGE) {
			if (!availability.isAvailable) {
				throw new ForbiddenException(
					`Village admin assignment for this village is currently ${availability.unavailableReason ?? 'unavailable'}. ` +
						'Use a tier-2+ override path with a documented reason.',
				);
			}
			if (availability.activeAdminId !== actor.userId) {
				throw new ForbiddenException(
					'Village admins can only allocate to applications in their assigned village.',
				);
			}
			return;
		}

		// Ward admin override: must own the application's ward.
		if (tier === AllocationActorTier.WARD) {
			if (actor.wardId !== applicationWardId) {
				throw new ForbiddenException(
					'Ward admins can only override allocations within their own ward.',
				);
			}
		}

		// Tier 2-4 (any non-VILLAGE actor): village admin MUST be unavailable.
		if (availability.isAvailable) {
			throw new ForbiddenException(
				'Override blocked: village admin is currently available. ' +
					'Tier-2+ overrides are only permitted when the village admin is unavailable per §7.4.',
			);
		}

		// Override reason code in DTO must match system-detected reason (or be omitted, which we backfill).
		if (
			dto.overrideReasonCode &&
			dto.overrideReasonCode !== availability.unavailableReason
		) {
			throw new BadRequestException(
				`Declared overrideReasonCode=${dto.overrideReasonCode} does not match the system-detected reason ${availability.unavailableReason}.`,
			);
		}

		// Strongly recommend a free-text justification on overrides; require for COUNTY and FINANCE tiers.
		if (
			(tier === AllocationActorTier.COUNTY || tier === AllocationActorTier.FINANCE) &&
			!dto.overrideReasonNote
		) {
			throw new BadRequestException(
				'overrideReasonNote (free-text justification) is required for COUNTY and FINANCE tier overrides.',
			);
		}

		// Sentinel: if availability detector returned no specific reason, refuse the override.
		if (!availability.unavailableReason) {
			throw new ForbiddenException(
				'Cannot determine why the village admin is unavailable; refusing override.',
			);
		}
		// silence the unused tier param warning
		void tier;
		void OverrideReasonCode;
	}

	/**
	 * List applications pending the §7 Stage 4 final allocation in a given village.
	 * Used by the village-admin allocation queue UI (Commit 5c). Includes the
	 * active village_budget_allocation snapshot so the UI can render the pool
	 * cap, allocated-so-far, and the running remaining-to-allocate without a
	 * second roundtrip.
	 *
	 * Authorization is delegated to the controller's @Roles guard; service-level
	 * defence: countyId scope is mandatory, and VILLAGE_ADMIN callers are
	 * additionally pinned to their assigned village by the controller before
	 * invocation. Other privileged tiers (WARD_ADMIN, COUNTY_ADMIN,
	 * FINANCE_OFFICER) may inspect any village in their tenant.
	 */
	async listPendingForVillage(
		countyId: string,
		villageUnitId: string,
	) {
		const village = await this.prisma.villageUnit.findFirst({
			where: { id: villageUnitId, countyId },
			select: { id: true, name: true, code: true, wardId: true, ward: { select: { id: true, name: true, code: true } } },
		});
		if (!village) {
			throw new NotFoundException('Village not found.');
		}

		// Most recent village_budget_allocation row for the village (across programs);
		// the queue UI shows the pool snapshot for orientation. Multiple programs
		// may have allocations to the same village concurrently — surface them all.
		const villageAllocations = await this.prisma.villageBudgetAllocation.findMany({
			where: { villageUnitId, countyId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				programId: true,
				allocatedKes: true,
				allocatedTotalKes: true,
				disbursedTotalKes: true,
				distributionMethod: true,
				villageAllocationDueAt: true,
				program: { select: { id: true, name: true, academicYear: true } },
			},
		});

		const applications = await this.prisma.application.findMany({
			where: {
				countyId,
				status: ApplicationStatus.VILLAGE_ALLOCATION_PENDING,
				applicant: { profile: { villageUnitId } },
			},
			orderBy: [{ createdAt: 'asc' }],
			select: {
				id: true,
				submissionReference: true,
				status: true,
				amountRequested: true,
				amountAllocated: true,
				wardId: true,
				programId: true,
				villageBudgetAllocationId: true,
				createdAt: true,
				updatedAt: true,
				applicant: {
					select: {
						profile: {
							select: { fullName: true, phone: true, villageUnitId: true },
						},
					},
				},
				program: { select: { id: true, name: true, academicYear: true } },
				ward: { select: { id: true, name: true, code: true } },
			},
		});

		return {
			village,
			villageAllocations: villageAllocations.map((row) => ({
				...row,
				allocatedKes: Number(row.allocatedKes),
				allocatedTotalKes: Number(row.allocatedTotalKes),
				disbursedTotalKes: Number(row.disbursedTotalKes),
				remainingKes:
					Number(row.allocatedKes) - Number(row.allocatedTotalKes),
			})),
			applications: applications.map((app) => ({
				id: app.id,
				submissionReference: app.submissionReference,
				status: app.status,
				amountRequested:
					app.amountRequested != null ? Number(app.amountRequested) : null,
				amountAllocated:
					app.amountAllocated != null ? Number(app.amountAllocated) : null,
				program: app.program,
				ward: app.ward,
				applicantName: app.applicant?.profile?.fullName ?? null,
				applicantPhone: app.applicant?.profile?.phone ?? null,
				villageBudgetAllocationId: app.villageBudgetAllocationId,
				createdAt: app.createdAt,
				updatedAt: app.updatedAt,
			})),
		};
	}
}
