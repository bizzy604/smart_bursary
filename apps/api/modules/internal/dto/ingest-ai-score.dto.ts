/**
 * Purpose: Define transport contract for internal AI score ingestion.
 * Why important: Validates service-to-service payloads before they mutate review state.
 * Used by: InternalController ai-score ingestion endpoint.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class IngestAiScoreDto {
	@ApiProperty({ example: 'a6f57538-cb38-4fc0-b5f8-d225c7600e8e' })
	@IsUUID()
	applicationId!: string;

	@ApiProperty({ example: '4e89f8f1-5f6d-4d62-8d9b-4ac4e3bcbf75' })
	@IsUUID()
	countyId!: string;

	@ApiProperty({ example: 78.5 })
	@IsNumber({ maxDecimalPlaces: 2 })
	totalScore!: number;

	@ApiPropertyOptional({ example: ["duplicate_national_id"] })
	@IsOptional()
	@IsArray()
	anomalyFlags?: unknown[];

	@ApiPropertyOptional({ example: { FEE_STRUCTURE: { quality_score: 9 } } })
	@IsOptional()
	@IsObject()
	documentAnalysis?: Record<string, unknown>;

	@ApiProperty({ example: { family_status: 0.3, family_income: 0.25 } })
	@IsObject()
	weightsApplied!: Record<string, number>;

	@ApiPropertyOptional({ example: 'v1.2.0' })
	@IsOptional()
	@IsString()
	modelVersion?: string;

	@ApiPropertyOptional({ example: 25 })
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	familyStatusScore?: number;

	@ApiPropertyOptional({ example: 20 })
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	familyIncomeScore?: number;

	@ApiPropertyOptional({ example: 15 })
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	educationBurdenScore?: number;

	@ApiPropertyOptional({ example: 10.5 })
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	academicStandingScore?: number;

	@ApiPropertyOptional({ example: 8 })
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	documentQualityScore?: number;

	@ApiPropertyOptional({ example: 0 })
	@IsOptional()
	@IsNumber({ maxDecimalPlaces: 2 })
	integrityScore?: number;
}
