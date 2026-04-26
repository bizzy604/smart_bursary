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
	Get,
	HttpCode,
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
