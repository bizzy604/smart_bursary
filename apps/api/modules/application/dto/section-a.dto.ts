/**
 * Purpose: Validate Section A personal and academic payload.
 * Why important: Enforces canonical applicant identity and school details before scoring and review.
 * Used by: SectionService when persisting application section data.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

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

	@ApiProperty({ example: 'Year 2' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(40)
	yearOfStudy!: string;
}
