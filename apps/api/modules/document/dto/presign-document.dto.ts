/**
 * Purpose: Transport contract for requesting a document upload presign operation.
 * Why important: Ensures metadata and content constraints are validated before storage keys are issued.
 * Used by: Future document presign endpoint and upload orchestration.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

import {
	ALLOWED_DOCUMENT_TYPES,
	ALLOWED_UPLOAD_CONTENT_TYPES,
	MAX_DOCUMENT_SIZE_BYTES,
} from '../document.constants';

export class PresignDocumentDto {
	@ApiProperty({
		description: 'Application identifier owning the document',
		example: 'a6f57538-cb38-4fc0-b5f8-d225c7600e8e',
	})
	@IsUUID()
	@IsNotEmpty()
	applicationId!: string;

	@ApiProperty({
		description: 'Document type/category',
		example: 'FEE_STRUCTURE',
		enum: ALLOWED_DOCUMENT_TYPES,
	})
	@IsString()
	@IsIn(ALLOWED_DOCUMENT_TYPES)
	docType!: string;

	@ApiProperty({
		description: 'Original filename from client upload',
		example: 'fee-statement-2026.pdf',
	})
	@IsString()
	@MaxLength(255)
	fileName!: string;

	@ApiProperty({
		description: 'Declared MIME type for upload',
		example: 'application/pdf',
		enum: ALLOWED_UPLOAD_CONTENT_TYPES,
	})
	@IsString()
	@IsIn(ALLOWED_UPLOAD_CONTENT_TYPES)
	contentType!: string;

	@ApiProperty({
		description: 'File size in bytes',
		example: 245000,
		minimum: 1,
		maximum: MAX_DOCUMENT_SIZE_BYTES,
	})
	@IsInt()
	@Min(1)
	@Max(MAX_DOCUMENT_SIZE_BYTES)
	fileSizeBytes!: number;
}
