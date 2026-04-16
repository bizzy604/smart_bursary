/**
 * Purpose: Transport contract for listing bursary programs.
 * Why important: Provides queryable filters for students to find relevant programs.
 * Used by: ProgramController list endpoint.
 */
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListProgramsDto {
	@ApiPropertyOptional({
		description: 'Optional status filter',
		example: 'ACTIVE',
	})
	@IsOptional()
	@IsString()
	status?: string;

	@ApiPropertyOptional({
		description: 'Optional academic year filter',
		example: '2026/2027',
	})
	@IsOptional()
	@IsString()
	academicYear?: string;
}
