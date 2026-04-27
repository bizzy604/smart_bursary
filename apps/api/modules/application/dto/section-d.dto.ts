/**
 * Purpose: Validate Section D household income and financial pressure payload.
 * Why important: Supplies normalized financial burden context required for fairness checks and AI feature extraction.
 * Used by: SectionService when persisting application section data.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsInt,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	MinLength,
	MaxLength,
	Min,
	ValidateNested,
	IsIn,
} from 'class-validator';

const OCCUPATION_VALUES = [
	'Farmer',
	'Teacher',
	'Doctor',
	'Nurse',
	'Engineer',
	'Accountant',
	'Lawyer',
	'Business',
	'Trader',
	'Driver',
	'Security',
	'Domestic Worker',
	'Civil Servant',
	'Self-Employed',
	'Unemployed',
	'Retired',
	'Student',
	'Other',
] as const;

export class SectionDIncomeDto {
	@ApiPropertyOptional({ enum: OCCUPATION_VALUES, example: 'Farmer' })
	@IsOptional()
	@IsIn(OCCUPATION_VALUES)
	@IsString()
	@MaxLength(120)
	fatherOccupation?: (typeof OCCUPATION_VALUES)[number];

	@ApiPropertyOptional({ example: 15000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	fatherMonthlyIncomeKes?: number;

	@ApiPropertyOptional({ enum: OCCUPATION_VALUES, example: 'Trader' })
	@IsOptional()
	@IsIn(OCCUPATION_VALUES)
	@IsString()
	@MaxLength(120)
	motherOccupation?: (typeof OCCUPATION_VALUES)[number];

	@ApiPropertyOptional({ example: 12000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	motherMonthlyIncomeKes?: number;

	@ApiPropertyOptional({ enum: OCCUPATION_VALUES, example: 'Casual Labour' })
	@IsOptional()
	@IsIn(OCCUPATION_VALUES)
	@IsString()
	@MaxLength(120)
	guardianOccupation?: (typeof OCCUPATION_VALUES)[number];

	@ApiPropertyOptional({ example: 6000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	guardianMonthlyIncomeKes?: number;

	@ApiPropertyOptional({ example: 'Small kiosk sales' })
	@IsOptional()
	@IsString()
	@MaxLength(200)
	additionalIncomeSource?: string;

	@ApiPropertyOptional({ example: 3000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	additionalIncomeKes?: number;
}

export class SectionDDto {
	@ApiProperty({ type: SectionDIncomeDto })
	@IsObject()
	@ValidateNested()
	@Type(() => SectionDIncomeDto)
	income!: SectionDIncomeDto;

	@ApiPropertyOptional({ example: 18000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	rentOrBoardingKes?: number;

	@ApiPropertyOptional({ example: 4000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	medicalSupportKes?: number;

	@ApiPropertyOptional({ example: 10000 })
	@IsOptional()
	@IsInt()
	@Min(0)
	supportFromWellWishersKes?: number;

	@ApiProperty({
		example:
			'My parent income dropped after drought and we have accumulated fee arrears that may lead to deferment.',
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(30)
	@MaxLength(3000)
	hardshipNarrative!: string;
}
