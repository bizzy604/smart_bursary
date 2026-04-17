/**
 * Purpose: Define validated payload for creating bursary programs.
 * Why important: Protects program lifecycle integrity at API boundary.
 * Used by: ProgramController create endpoint.
 */
import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsDateString,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EligibilityRuleDto } from './eligibility-rule.dto';

export class CreateProgramDto {
	@ApiProperty({
		description: 'Program display name.',
		example: '2026 Ward Bursary Programme',
	})
	@IsString()
	@MaxLength(255)
	name!: string;

	@ApiPropertyOptional({
		description: 'Optional program description.',
		example: 'Annual bursary intake for county learners.',
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({
		description: 'Optional ward scope identifier. Omit for county-wide scope.',
		example: '4f3ec996-3f26-4f04-9502-2fcae94e624f',
	})
	@IsOptional()
	@IsUUID()
	wardId?: string;

	@ApiProperty({
		description: 'Budget ceiling in KES.',
		example: 5000000,
	})
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	budgetCeiling!: number;

	@ApiProperty({
		description: 'Program open timestamp (ISO-8601).',
		example: '2026-05-01T00:00:00.000Z',
	})
	@IsDateString()
	opensAt!: string;

	@ApiProperty({
		description: 'Program close timestamp (ISO-8601).',
		example: '2026-06-30T23:59:59.000Z',
	})
	@IsDateString()
	closesAt!: string;

	@ApiPropertyOptional({
		description: 'Academic year label.',
		example: '2026',
	})
	@IsOptional()
	@IsString()
	@MaxLength(10)
	academicYear?: string;

	@ApiPropertyOptional({
		description: 'Eligibility rules attached to the program.',
		type: [EligibilityRuleDto],
	})
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(20)
	@ValidateNested({ each: true })
	@Type(() => EligibilityRuleDto)
	eligibilityRules?: EligibilityRuleDto[];
}
