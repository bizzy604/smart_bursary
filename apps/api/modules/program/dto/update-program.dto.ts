/**
 * Purpose: Define validated payload for updating draft bursary programs.
 * Why important: Restricts mutable fields and protects lifecycle invariants.
 * Used by: ProgramController update endpoint.
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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EligibilityRuleDto } from './eligibility-rule.dto';

export class UpdateProgramDto {
	@ApiPropertyOptional({
		description: 'Updated program display name.',
		example: '2026 Ward Bursary Programme - Revised',
	})
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

	@ApiPropertyOptional({
		description: 'Updated description.',
		example: 'Updated program narrative for approved budget envelope.',
	})
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({
		description: 'Updated ward scope identifier.',
		example: '4f3ec996-3f26-4f04-9502-2fcae94e624f',
	})
	@IsOptional()
	@IsUUID()
	wardId?: string;

	@ApiPropertyOptional({
		description: 'Updated budget ceiling in KES.',
		example: 6500000,
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	budgetCeiling?: number;

	@ApiPropertyOptional({
		description: 'Updated open timestamp (ISO-8601).',
		example: '2026-05-03T00:00:00.000Z',
	})
	@IsOptional()
	@IsDateString()
	opensAt?: string;

	@ApiPropertyOptional({
		description: 'Updated close timestamp (ISO-8601).',
		example: '2026-07-01T23:59:59.000Z',
	})
	@IsOptional()
	@IsDateString()
	closesAt?: string;

	@ApiPropertyOptional({
		description: 'Updated academic year label.',
		example: '2026',
	})
	@IsOptional()
	@IsString()
	@MaxLength(10)
	academicYear?: string;

	@ApiPropertyOptional({
		description: 'Replaced eligibility rules list. If provided, replaces existing rules.',
		type: [EligibilityRuleDto],
	})
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(20)
	@ValidateNested({ each: true })
	@Type(() => EligibilityRuleDto)
	eligibilityRules?: EligibilityRuleDto[];
}
