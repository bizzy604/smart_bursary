/**
 * Purpose: Define transport contract for county-level review submissions.
 * Why important: Enforces valid final allocation decisions and amount constraints.
 * Used by: ReviewController county review endpoint and CountyReviewService.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export enum CountyReviewDecision {
	APPROVED = 'APPROVED',
	REJECTED = 'REJECTED',
	WAITLISTED = 'WAITLISTED',
}

export class CountyReviewDto {
	@ApiProperty({
		description: 'Final county finance decision for an application in COUNTY_REVIEW stage.',
		enum: CountyReviewDecision,
		example: CountyReviewDecision.APPROVED,
	})
	@IsEnum(CountyReviewDecision)
	decision!: CountyReviewDecision;

	@ApiPropertyOptional({
		description: 'Final allocated amount in KES. Required when decision is APPROVED.',
		example: 38000,
	})
	@ValidateIf((dto: CountyReviewDto) => dto.decision === CountyReviewDecision.APPROVED)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	allocatedAmount?: number;

	@ApiPropertyOptional({
		description: 'County review note for committee audit trail.',
		example: 'Approved with reduced allocation due to budget envelope.',
	})
	@IsOptional()
	@IsString()
	@MaxLength(1500)
	note?: string;
}
