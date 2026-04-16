/**
 * Purpose: Expose ward and county review decision endpoints.
 * Why important: Provides controlled entry points for human committee decision workflows.
 * Used by: Ward admin and finance officer portals during P5 review lifecycle.
 */
import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CountyReviewService } from './county-review.service';
import { CountyReviewDto } from './dto/county-review.dto';
import { WardReviewDto } from './dto/ward-review.dto';
import { WardReviewService } from './ward-review.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Reviews')
@ApiBearerAuth()
@Controller()
export class ReviewController {
	constructor(
		private readonly wardReviewService: WardReviewService,
		private readonly countyReviewService: CountyReviewService,
	) {}

	@Post('applications/:id/review/ward')
	@HttpCode(200)
	@Roles(UserRole.WARD_ADMIN)
	@ApiOperation({ summary: 'Submit ward-level review decision' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	@ApiBody({ type: WardReviewDto })
	submitWardReview(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
		@Body() dto: WardReviewDto,
	) {
		return this.wardReviewService.submitWardReview(
			countyId,
			user['userId'] as string,
			(user['wardId'] as string | null) ?? null,
			applicationId,
			dto,
		);
	}

	@Post('applications/:id/review/county')
	@HttpCode(200)
	@Roles(UserRole.FINANCE_OFFICER)
	@ApiOperation({ summary: 'Submit county-level allocation decision' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	@ApiBody({ type: CountyReviewDto })
	submitCountyReview(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
		@Body() dto: CountyReviewDto,
	) {
		return this.countyReviewService.submitCountyReview(
			countyId,
			user['userId'] as string,
			applicationId,
			dto,
		);
	}
}
