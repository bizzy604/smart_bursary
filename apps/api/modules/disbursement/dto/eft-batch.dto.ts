/**
 * Purpose: Define the request payload for generating EFT/RTGS batch exports.
 * Why important: Keeps bank export requests validated and county-scoped.
 * Used by: EftExportService and future finance officer batch export endpoints.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class EftBatchDto {
	@ApiProperty({
		description: 'Approved application identifiers to include in the batch export',
		example: ['a6f57538-cb38-4fc0-b5f8-d225c7600e8e'],
		type: [String],
	})
	@IsArray()
	@ArrayNotEmpty()
	@IsUUID('4', { each: true })
	applicationIds!: string[];

	@ApiPropertyOptional({
		description: 'Optional friendly batch name',
		example: 'turkana-q2-rtgs',
	})
	@IsOptional()
	@IsString()
	batchName?: string;
}
