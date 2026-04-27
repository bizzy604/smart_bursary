/**
 * Purpose: Validate Section A personal and academic payload.
 * Why important: Enforces canonical applicant identity and school details before scoring and review.
 * Used by: SectionService when persisting application section data.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

const YEAR_OF_STUDY_VALUES = [
	'Year 1',
	'Year 2',
	'Year 3',
	'Year 4',
	'Year 5',
	'Year 6',
	'Final Year',
] as const;

export class SectionADto {
	@ApiProperty({ example: 'Jane Akiru Ekiru' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	fullName!: string;

	@ApiProperty({ example: '12345678' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(40)
	nationalIdOrBirthCert!: string;

	@ApiProperty({ example: '+254700000001' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(20)
	phone!: string;

	@ApiProperty({ example: 'student@example.com' })
	@IsEmail()
	@MaxLength(255)
	email!: string;

	@ApiProperty({ example: 'University of Nairobi' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	institution!: string;

	@ApiProperty({ example: 'UON/2023/001' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	admissionNumber!: string;

	@ApiProperty({ example: 'BSc Computer Science' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	course!: string;

	@ApiProperty({ enum: YEAR_OF_STUDY_VALUES, example: 'Year 2' })
	@IsIn(YEAR_OF_STUDY_VALUES)
	@IsString()
	@IsNotEmpty()
	@MaxLength(40)
	yearOfStudy!: (typeof YEAR_OF_STUDY_VALUES)[number];

	@ApiProperty({ example: 'sub-county-id' })
	@IsString()
	@IsOptional()
	subCountyId?: string;

	@ApiProperty({ example: 'ward-id' })
	@IsString()
	@IsOptional()
	wardId?: string;

	@ApiProperty({ example: 'village-unit-id' })
	@IsString()
	@IsOptional()
	villageUnitId?: string;
}
