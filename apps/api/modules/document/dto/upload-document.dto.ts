/**
 * Purpose: Transport contract for document upload metadata.
 * Why important: Validates required application linkage and document type fields.
 * Used by: DocumentController upload endpoint.
 */

import { IsUUID, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    example: 'NATIONAL_ID',
  })
  @IsString()
  @IsNotEmpty()
  docType!: string;
}
