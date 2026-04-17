/**
 * Purpose: Validate platform-operator updates for county subscription plans.
 * Why important: Ensures plan-tier transitions use supported tier values only.
 * Used by: TenantProvisioningController and ProvisioningService.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { PLAN_TIERS } from '../../../common/decorators/plan-tier.decorator';

export class UpdateCountyPlanDto {
	@ApiProperty({ enum: PLAN_TIERS, example: 'ENTERPRISE' })
	@IsIn(PLAN_TIERS)
	planTier!: (typeof PLAN_TIERS)[number];
}
