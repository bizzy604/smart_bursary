/**
 * Purpose: Transport contract for listing bursary programs.
 * Why important: Provides queryable filters for students to find relevant programs.
 * Used by: ProgramController list endpoint.
 */
import { IsOptional, IsString } from 'class-validator';

export class ListProgramsDto {
	@IsOptional()
	@IsString()
	status?: string;

	@IsOptional()
	@IsString()
	academicYear?: string;
}
