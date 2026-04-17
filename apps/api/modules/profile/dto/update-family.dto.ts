/**
 * Purpose: Validate student family and financial profile updates.
 * Why important: Ensures family-context data remains consistent for scoring and eligibility.
 * Used by: ProfileController family patch endpoint.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateFamilyDto {
	@ApiPropertyOptional({ description: 'Family status label', example: 'SINGLE_PARENT' })
	@IsOptional()
	@IsString()
	@MaxLength(30)
	familyStatus?: string;

	@ApiPropertyOptional({ description: 'Whether applicant has a disability', example: false })
	@IsOptional()
	@IsBoolean()
	hasDisability?: boolean;

	@ApiPropertyOptional({ description: 'Disability details when applicable' })
	@IsOptional()
	@IsString()
	disabilityDetails?: string;

	@ApiPropertyOptional({ description: 'Guardian full name' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	guardianName?: string;

	@ApiPropertyOptional({ description: 'Guardian occupation' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	guardianOccupation?: string;

	@ApiPropertyOptional({ description: 'Guardian contact number' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	guardianContact?: string;

	@ApiPropertyOptional({ description: 'Total number of siblings', example: 4 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	numSiblings?: number;

	@ApiPropertyOptional({ description: 'Number of guardian children', example: 2 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	numGuardianChildren?: number;

	@ApiPropertyOptional({ description: 'Number of siblings currently in school', example: 2 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	numSiblingsInSchool?: number;

	@ApiPropertyOptional({ description: 'Father occupation' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	fatherOccupation?: string;

	@ApiPropertyOptional({ description: 'Father annual income in KES', example: 200000 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	fatherIncomeKes?: number;

	@ApiPropertyOptional({ description: 'Mother occupation' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	motherOccupation?: string;

	@ApiPropertyOptional({ description: 'Mother annual income in KES', example: 120000 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	motherIncomeKes?: number;

	@ApiPropertyOptional({ description: 'Guardian annual income in KES', example: 50000 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	guardianIncomeKes?: number;

	@ApiPropertyOptional({
		description: 'Per-sibling education breakdown payload',
		type: [Object],
	})
	@IsOptional()
	@IsArray()
	@IsObject({ each: true })
	siblingEducationDetails?: Record<string, unknown>[];

	@ApiPropertyOptional({ description: 'Orphan sponsor name' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	orphanSponsorName?: string;

	@ApiPropertyOptional({ description: 'Orphan sponsor relation' })
	@IsOptional()
	@IsString()
	@MaxLength(60)
	orphanSponsorRelation?: string;

	@ApiPropertyOptional({ description: 'Orphan sponsor contact' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	orphanSponsorContact?: string;
}
