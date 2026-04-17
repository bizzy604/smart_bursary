/**
 * Purpose: Validate student academic and bank profile updates.
 * Why important: Protects downstream eligibility and disbursement workflows from malformed data.
 * Used by: ProfileController academic patch endpoint.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAcademicDto {
	@ApiPropertyOptional({ description: 'Institution type', example: 'UNIVERSITY' })
	@IsOptional()
	@IsString()
	@MaxLength(30)
	institutionType?: string;

	@ApiPropertyOptional({ description: 'Institution name', example: 'University of Nairobi' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	institutionName?: string;

	@ApiPropertyOptional({ description: 'Class or year of study', example: 'Year 2' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	yearFormClass?: string;

	@ApiPropertyOptional({ description: 'Admission number', example: 'F56/1234/2023' })
	@IsOptional()
	@IsString()
	@MaxLength(60)
	admissionNumber?: string;

	@ApiPropertyOptional({ description: 'Course name', example: 'Bachelor of Education' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	courseName?: string;

	@ApiPropertyOptional({ description: 'Bank account holder name', example: 'Aisha Lokiru' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	bankAccountName?: string;

	@ApiPropertyOptional({ description: 'Bank account number', example: '1234567890' })
	@IsOptional()
	@IsString()
	@MaxLength(60)
	bankAccountNumber?: string;

	@ApiPropertyOptional({ description: 'Bank name', example: 'Equity Bank' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	bankName?: string;

	@ApiPropertyOptional({ description: 'Bank branch', example: 'Lodwar' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	bankBranch?: string;
}
