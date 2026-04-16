/**
 * Purpose: Define query contract for ranked program score lookups.
 * Why important: Validates optional ward and status filters for committee views.
 * Used by: AiController list program scores endpoint.
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListProgramScoresDto {
	@ApiPropertyOptional({
		description: 'Optional ward filter for county-level reviewers.',
		example: '3df95b79-4f8f-4dba-9d50-c385ea69a8dc',
	})
	@IsOptional()
	@IsUUID()
	wardId?: string;

	@ApiPropertyOptional({
		description: 'Optional comma-separated application statuses.',
		example: 'WARD_REVIEW,COUNTY_REVIEW',
	})
	@IsOptional()
	@IsString()
	@MaxLength(120)
	status?: string;
}
