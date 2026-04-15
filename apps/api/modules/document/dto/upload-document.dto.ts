/**
 * Upload Document DTO
 * Payload for document submission via multipart form upload
 */

import { IsUUID, IsNotEmpty, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  applicationId!: string;

  @IsString()
  @IsNotEmpty()
  docType!: string;
}
