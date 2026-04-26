/**
 * Purpose: Validate reporting filter and export query parameters.
 * Why important: Keeps reporting endpoints predictable and prevents invalid scope inputs.
 * Used by: ReportingController and reporting analytics services.
 */
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportScopeQueryDto {
	@ApiPropertyOptional({ description: 'Filter by program id' })
	@IsOptional()
	@IsUUID()
	programId?: string;

	@ApiPropertyOptional({ description: 'Filter by ward id' })
	@IsOptional()
	@IsUUID()
	wardId?: string;

	@ApiPropertyOptional({ description: 'Filter by village unit id' })
	@IsOptional()
	@IsUUID()
	villageUnitId?: string;

	@ApiPropertyOptional({ description: 'Filter by program academic year', example: '2026' })
	@IsOptional()
	@IsString()
	academicYear?: string;

	@ApiPropertyOptional({ description: 'Filter by education level', example: 'UNIVERSITY' })
	@IsOptional()
	@IsString()
	educationLevel?: string;
}

export class ReportExportQueryDto extends ReportScopeQueryDto {
	@ApiPropertyOptional({ enum: ['csv', 'pdf'], default: 'csv' })
	@IsOptional()
	@IsIn(['csv', 'pdf'])
	format?: 'csv' | 'pdf';
}

export class TrendReportQueryDto extends ReportScopeQueryDto {
	@ApiPropertyOptional({ description: 'Inclusive start year', example: 2024 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(2010)
	@Max(2100)
	fromYear?: number;

	@ApiPropertyOptional({ description: 'Inclusive end year', example: 2026 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(2010)
	@Max(2100)
	toYear?: number;
}
