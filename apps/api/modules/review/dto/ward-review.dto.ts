/**
 * Purpose: Define transport contract for ward-level review submissions.
 * Why important: Enforces valid ward review decisions and recommendation payload shape.
 * Used by: ReviewController ward review endpoint and WardReviewService.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export enum WardReviewDecision {
	RECOMMENDED = 'RECOMMENDED',
	RETURNED = 'RETURNED',
	REJECTED = 'REJECTED',
}

export class WardReviewDto {
	@ApiProperty({
		description: 'Ward committee decision for an application in WARD_REVIEW stage.',
		enum: WardReviewDecision,
		example: WardReviewDecision.RECOMMENDED,
	})
	@IsEnum(WardReviewDecision)
	decision!: WardReviewDecision;

	@ApiPropertyOptional({
		description: 'Recommended amount in KES. Required when decision is RECOMMENDED.',
		example: 40000,
	})
	@ValidateIf((dto: WardReviewDto) => dto.decision === WardReviewDecision.RECOMMENDED)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	recommendedAmount?: number;

	@ApiPropertyOptional({
		description: 'Review note for committee audit trail.',
		example: 'Household need verified by ward committee.',
	})
	@IsOptional()
	@IsString()
	@MaxLength(1500)
	note?: string;
}
