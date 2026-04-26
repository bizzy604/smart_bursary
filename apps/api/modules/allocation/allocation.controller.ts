/**
 * Purpose: Expose the three-stage allocation API surface (Ward → Village → Student).
 * Why important: Provides the controlled HTTP entry points for the §7 money-integrity flow,
 *                applying tenant scope, role guards, and DTO validation before delegating to
 *                the service layer (which owns the invariant + advisory-lock logic).
 * Used by: County/Ward/Village admin portals during budget distribution and allocation.
 */
import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	HttpCode,
	NotFoundException,
	Param,
	Post,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import { AllocateToStudentDto } from './dto/allocate-to-student.dto';
import { CreateWardAllocationDto } from './dto/create-ward-allocation.dto';
import { DistributeVillageAllocationsDto } from './dto/distribute-village-allocations.dto';
import { StudentAllocationService } from './services/student-allocation.service';
import { VillageBudgetAllocationService } from './services/village-budget-allocation.service';
import { WardBudgetAllocationService } from './services/ward-budget-allocation.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Allocations')
@ApiBearerAuth()
@Controller()
export class AllocationController {
	constructor(
		private readonly wardBudgetService: WardBudgetAllocationService,
		private readonly villageBudgetService: VillageBudgetAllocationService,
		private readonly studentAllocationService: StudentAllocationService,
		private readonly prisma: PrismaService,
	) {}

	// ─── Stage 2: County → Ward ───────────────────────────────────────────

	@Post('programs/:programId/ward-allocations')
	@HttpCode(201)
	@Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Create or update a ward-level budget allocation for a program.' })
	@ApiParam({ name: 'programId', description: 'Program identifier' })
	@ApiBody({ type: CreateWardAllocationDto })
	createWardAllocation(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('programId') programId: string,
		@Body() dto: CreateWardAllocationDto,
	) {
		return this.wardBudgetService.create(
			countyId,
			user['userId'] as string,
			programId,
			dto,
		);
	}

	@Get('programs/:programId/ward-allocations')
	@Roles(
		UserRole.COUNTY_ADMIN,
		UserRole.FINANCE_OFFICER,
		UserRole.WARD_ADMIN,
		UserRole.PLATFORM_OPERATOR,
	)
	@ApiOperation({ summary: 'List ward-level allocations for a program.' })
	@ApiParam({ name: 'programId', description: 'Program identifier' })
	listWardAllocations(@County() countyId: string, @Param('programId') programId: string) {
		return this.wardBudgetService.listByProgram(countyId, programId);
	}

	// ─── Stage 3: Ward → Village distribution ─────────────────────────────

	@Get('ward-allocations/:wardAllocationId/proportional-suggestion')
	@Roles(UserRole.WARD_ADMIN, UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({
		summary: 'Compute the system-recommended proportional split of the ward pool across villages.',
	})
	@ApiParam({ name: 'wardAllocationId', description: 'Ward allocation identifier' })
	getProportionalSuggestion(
		@County() countyId: string,
		@Param('wardAllocationId') wardAllocationId: string,
	) {
		return this.villageBudgetService.computeProportionalSuggestion(countyId, wardAllocationId);
	}

	@Post('ward-allocations/:wardAllocationId/distribute')
	@HttpCode(201)
	@Roles(UserRole.WARD_ADMIN, UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Persist the ward → village pool distribution decision.' })
	@ApiParam({ name: 'wardAllocationId', description: 'Ward allocation identifier' })
	@ApiBody({ type: DistributeVillageAllocationsDto })
	distributeWardToVillages(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('wardAllocationId') wardAllocationId: string,
		@Body() dto: DistributeVillageAllocationsDto,
	) {
		return this.villageBudgetService.distribute(
			countyId,
			user['userId'] as string,
			(user['wardId'] as string | null) ?? null,
			wardAllocationId,
			dto,
		);
	}

	@Get('ward-allocations/:wardAllocationId/villages')
	@Roles(
		UserRole.WARD_ADMIN,
		UserRole.COUNTY_ADMIN,
		UserRole.FINANCE_OFFICER,
		UserRole.VILLAGE_ADMIN,
		UserRole.PLATFORM_OPERATOR,
	)
	@ApiOperation({ summary: 'List village pool allocations for a ward allocation.' })
	@ApiParam({ name: 'wardAllocationId', description: 'Ward allocation identifier' })
	listVillageAllocations(
		@County() countyId: string,
		@Param('wardAllocationId') wardAllocationId: string,
	) {
		return this.villageBudgetService.listByWardAllocation(countyId, wardAllocationId);
	}

	// ─── Stage 4: Village → Student final allocation ──────────────────────

	// ─── Village admin queue + self-info (Commit 5c support) ──────────────

	@Get('village-admin/me')
	@Roles(UserRole.VILLAGE_ADMIN)
	@ApiOperation({
		summary:
			'Return the active village admin assignment(s) for the authenticated user. ' +
			'Used by the village-admin allocation queue UI to discover its own village(s).',
	})
	async getMyVillageAssignments(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
	) {
		const userId = user['userId'] as string;
		const assignments = await this.prisma.villageAdminAssignment.findMany({
			where: { userId, countyId, isActive: true },
			select: {
				id: true,
				villageUnitId: true,
				assignedAt: true,
				villageUnit: {
					select: {
						id: true,
						name: true,
						code: true,
						wardId: true,
						ward: { select: { id: true, name: true, code: true } },
					},
				},
			},
		});
		return { assignments };
	}

	@Get('villages/:villageUnitId/pending-allocations')
	@Roles(
		UserRole.VILLAGE_ADMIN,
		UserRole.WARD_ADMIN,
		UserRole.COUNTY_ADMIN,
		UserRole.FINANCE_OFFICER,
		UserRole.PLATFORM_OPERATOR,
	)
	@ApiOperation({
		summary:
			'List applications in VILLAGE_ALLOCATION_PENDING for a specific village, ' +
			'with the active village_budget_allocation snapshot. Drives the §7 Stage 4 UI.',
	})
	@ApiParam({ name: 'villageUnitId', description: 'Village unit identifier' })
	async listVillagePendingAllocations(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('villageUnitId') villageUnitId: string,
	) {
		const role = user['role'] as UserRole;
		const userId = user['userId'] as string;
		const userWardId = (user['wardId'] as string | null) ?? null;

		// Authorization scoping (defense-in-depth on top of @Roles):
		//   - VILLAGE_ADMIN: must hold an active assignment to this village.
		//   - WARD_ADMIN: must own the ward containing this village.
		//   - COUNTY_ADMIN / FINANCE / PLATFORM: any village in their tenant
		//     (the @County decorator already pins countyId).
		if (role === UserRole.VILLAGE_ADMIN) {
			const owned = await this.prisma.villageAdminAssignment.count({
				where: { userId, villageUnitId, countyId, isActive: true },
			});
			if (owned === 0) {
				throw new ForbiddenException(
					'You are not assigned to this village.',
				);
			}
		} else if (role === UserRole.WARD_ADMIN) {
			const village = await this.prisma.villageUnit.findFirst({
				where: { id: villageUnitId, countyId },
				select: { wardId: true },
			});
			if (!village) {
				throw new NotFoundException('Village not found.');
			}
			if (village.wardId !== userWardId) {
				throw new ForbiddenException(
					'Ward admins can only view villages in their own ward.',
				);
			}
		}

		return this.studentAllocationService.listPendingForVillage(
			countyId,
			villageUnitId,
		);
	}

	@Post('applications/:applicationId/allocate')
	@HttpCode(200)
	@Roles(
		UserRole.VILLAGE_ADMIN,
		UserRole.WARD_ADMIN,
		UserRole.COUNTY_ADMIN,
		UserRole.FINANCE_OFFICER,
	)
	@ApiOperation({
		summary:
			'Set the final per-student allocation amount. Village admin is the primary actor; ' +
			'tier-2+ overrides are accepted only when the village admin is structurally unavailable.',
	})
	@ApiParam({ name: 'applicationId', description: 'Application identifier' })
	@ApiBody({ type: AllocateToStudentDto })
	allocateToStudent(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('applicationId') applicationId: string,
		@Body() dto: AllocateToStudentDto,
	) {
		return this.studentAllocationService.allocate(
			countyId,
			{
				userId: user['userId'] as string,
				role: user['role'] as UserRole,
				wardId: (user['wardId'] as string | null) ?? null,
			},
			applicationId,
			dto,
		);
	}
}
