/**
 * Purpose: Validate student personal profile update payloads.
 * Why important: Prevents invalid student identity data from entering the system.
 * Used by: ProfileController personal patch endpoint.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdatePersonalDto {
	@ApiPropertyOptional({ description: 'Student full name', example: 'Aisha Lokiru Ekeno' })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	fullName?: string;

	@ApiPropertyOptional({ description: 'National ID number', example: '12345678' })
	@IsOptional()
	@IsString()
	@Matches(/^[0-9]{6,20}$/)
	nationalId?: string;

	@ApiPropertyOptional({ description: 'Date of birth in ISO format', example: '2002-03-15' })
	@IsOptional()
	@IsDateString()
	dateOfBirth?: string;

	@ApiPropertyOptional({ description: 'Gender label', example: 'FEMALE' })
	@IsOptional()
	@IsString()
	@MaxLength(30)
	gender?: string;

	@ApiPropertyOptional({ description: 'Home ward', example: 'Kalokol' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	homeWard?: string;

	@ApiPropertyOptional({ description: 'Village or settlement unit', example: 'Nakuprat' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	villageUnit?: string;

	@ApiPropertyOptional({ description: 'Student phone number', example: '+254712345678' })
	@IsOptional()
	@IsString()
	@MaxLength(20)
	phone?: string;
}
