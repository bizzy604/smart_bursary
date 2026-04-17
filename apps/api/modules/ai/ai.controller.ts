/**
 * Purpose: Expose AI score lookup and scoring-weight administration endpoints.
 * Why important: Gives reviewers visibility into scores and county admins control over weights.
 * Used by: Ward admin, finance officer, and county admin portals.
 */
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlanTiers } from '../../common/decorators/plan-tier.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiScoreService } from './ai-score.service';
import { ListProgramScoresDto } from './dto/list-program-scores.dto';
import { ScoringWeightsDto } from './dto/scoring-weights.dto';
import { ScoringWeightsService } from './scoring-weights.service';

@UseGuards(JwtAuthGuard)
@ApiTags('AI')
@ApiBearerAuth()
@Controller()
export class AiController {
	constructor(
		private readonly aiScoreService: AiScoreService,
		private readonly scoringWeightsService: ScoringWeightsService,
	) {}

	@Get('applications/:id/score')
	@Roles(UserRole.WARD_ADMIN, UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Get AI score card for an application' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	getApplicationScore(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
	) {
		return this.aiScoreService.getApplicationScore(
			countyId,
			user['role'] as UserRole,
			(user['wardId'] as string | null) ?? null,
			applicationId,
		);
	}

	@Get('programs/:id/scores')
	@Roles(UserRole.WARD_ADMIN, UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Get ranked scores for a program' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	@ApiQuery({ name: 'wardId', required: false, type: String })
	@ApiQuery({ name: 'status', required: false, type: String })
	getProgramScores(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') programId: string,
		@Query() query: ListProgramScoresDto,
	) {
		return this.aiScoreService.listProgramScores(
			countyId,
			user['role'] as UserRole,
			(user['wardId'] as string | null) ?? null,
			programId,
			query,
		);
	}

	@Get('admin/scoring-weights')
	@Roles(UserRole.COUNTY_ADMIN)
	@PlanTiers('ENTERPRISE')
	@ApiOperation({ summary: 'Get county scoring weights' })
	getScoringWeights(@County() countyId: string) {
		return this.scoringWeightsService.getScoringWeights(countyId);
	}

	@Patch('admin/scoring-weights')
	@Roles(UserRole.COUNTY_ADMIN)
	@PlanTiers('ENTERPRISE')
	@ApiOperation({ summary: 'Update county scoring weights' })
	@ApiBody({ type: ScoringWeightsDto })
	updateScoringWeights(@County() countyId: string, @Body() dto: ScoringWeightsDto) {
		return this.scoringWeightsService.updateScoringWeights(countyId, dto);
	}
}
