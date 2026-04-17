/**
 * Purpose: Define canonical document upload constraints.
 * Why important: Enforces consistent file category and content validation across upload paths.
 * Used by: Document DTO validation and DocumentService upload guards.
 */

export const ALLOWED_DOCUMENT_TYPES = [
  'NATIONAL_ID',
  'BIRTH_CERTIFICATE',
  'FEE_STRUCTURE',
  'ADMISSION_LETTER',
  'RESULT_SLIP',
  'GUARDIAN_ID_COPY',
  'SCHOOL_TRANSCRIPT',
  'FEE_LETTER',
  'AFFIDAVIT',
  'MEDICAL_REPORT',
  'PROOF_OF_ENROLLMENT',
  'LEASE_AGREEMENT',
] as const;

export type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedUploadContentType = (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;