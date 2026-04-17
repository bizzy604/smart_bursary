/**
 * Purpose: Validate Section F attachment and declaration supporting payload.
 * Why important: Ensures document metadata from the wizard is consistently persisted with stable structure.
 * Used by: SectionService when persisting application section data.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsIn,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	ValidateNested,
} from 'class-validator';

const SECTION_F_DOCUMENT_TYPES = [
	'id-copy',
	'school-fee-structure',
	'admission-letter',
	'result-slip',
	'guardian-id-copy',
] as const;

export class SectionFDocumentDto {
	@ApiProperty({ enum: SECTION_F_DOCUMENT_TYPES, example: 'school-fee-structure' })
	@IsIn(SECTION_F_DOCUMENT_TYPES)
	type!: (typeof SECTION_F_DOCUMENT_TYPES)[number];

	@ApiProperty({ example: 'School Fee Structure' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	label!: string;

	@ApiProperty({ example: 'fee-structure-2026.pdf' })
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	fileName!: string;
}

export class SectionFDto {
	@ApiProperty({ type: [SectionFDocumentDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => SectionFDocumentDto)
	documents!: SectionFDocumentDto[];

	@ApiPropertyOptional({ example: 'I can provide additional stamped copies on request.' })
	@IsOptional()
	@IsString()
	@MaxLength(1000)
	additionalNotes?: string;
}
