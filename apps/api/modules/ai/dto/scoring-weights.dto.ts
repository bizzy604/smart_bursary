/**
 * Purpose: Define transport contract for county scoring weight updates.
 * Why important: Validates per-dimension constraints before persistence.
 * Used by: AiController and ScoringWeightsService.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class ScoringWeightsDto {
	@ApiProperty({ example: 0.3 })
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Max(0.4)
	family_status!: number;

	@ApiProperty({ example: 0.25 })
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Max(0.4)
	family_income!: number;

	@ApiProperty({ example: 0.2 })
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Max(0.4)
	education_burden!: number;

	@ApiProperty({ example: 0.1 })
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Max(0.4)
	academic_standing!: number;

	@ApiProperty({ example: 0.1 })
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Max(0.4)
	document_quality!: number;

	@ApiProperty({ example: 0.05 })
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Max(0.4)
	integrity!: number;
}
