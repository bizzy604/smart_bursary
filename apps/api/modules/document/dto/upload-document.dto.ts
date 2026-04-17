/**
 * Purpose: Transport contract for document upload metadata.
 * Why important: Validates required application linkage and document type fields.
 * Used by: DocumentController upload endpoint.
 */

import { IsUUID, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ALLOWED_DOCUMENT_TYPES } from '../document.constants';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Application identifier owning the uploaded file',
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
  @IsNotEmpty()
  docType!: string;
}
