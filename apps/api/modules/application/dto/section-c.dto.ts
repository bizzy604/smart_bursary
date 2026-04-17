/**
 * Purpose: Validate Section C family and sibling burden payload.
 * Why important: Captures family-status and sibling-education signals required for scoring and committee review.
 * Used by: SectionService when persisting application section data.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsIn,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';

const FAMILY_STATUS_VALUES = [
	'BOTH_PARENTS_ALIVE',
	'SINGLE_PARENT',
	'ORPHAN',
	'PERSON_WITH_DISABILITY',
] as const;

export class SectionCSiblingDto {
	@ApiProperty({ example: 'Akinyi Ekiru' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	name!: string;

	@ApiProperty({ example: 'Turkana Girls High School' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	institution!: string;

	@ApiProperty({ example: 'Form 3' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	level!: string;

	@ApiPropertyOptional({ example: 45000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	annualFeeKes?: number;

	@ApiPropertyOptional({ example: 20000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	feePaidKes?: number;
}

export class SectionCDto {
	@ApiProperty({ enum: FAMILY_STATUS_VALUES, example: 'SINGLE_PARENT' })
	@IsIn(FAMILY_STATUS_VALUES)
	familyStatus!: (typeof FAMILY_STATUS_VALUES)[number];

	@ApiProperty({ example: 'Mary Akiru' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	guardianName!: string;

	@ApiProperty({ example: 'Mother' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	guardianRelationship!: string;

	@ApiProperty({ example: '+254700000002' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(20)
	guardianPhone!: string;

	@ApiPropertyOptional({ example: 'Trader' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	guardianOccupation?: string;

	@ApiProperty({ example: 6 })
	@IsInt()
	@Min(1)
	householdSize!: number;

	@ApiPropertyOptional({ example: 3 })
	@IsOptional()
	@IsInt()
	@Min(0)
	dependantsInSchool?: number;

	@ApiPropertyOptional({ type: [SectionCSiblingDto] })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SectionCSiblingDto)
	siblings?: SectionCSiblingDto[];
}
