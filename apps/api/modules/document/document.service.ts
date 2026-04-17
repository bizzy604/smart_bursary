/**
 * Purpose: Orchestrate document persistence, storage, and scan status updates.
 * Why important: Keeps file handling and application-scoped access rules out of controllers.
 * Used by: DocumentController and the virus-scan queue adapter.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';
import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_UPLOAD_CONTENT_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from './document.constants';
import { S3Service } from './s3.service';

type UploadedDocumentFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type StoredDocument = {
  id: string;
  applicationId: string;
  docType: string;
  s3Key: string;
  originalName: string | null;
  contentType: string | null;
  fileSizeBytes: number | null;
  scanStatus: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
  scanCompletedAt: Date | null;
  uploadedAt: Date;
};

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly s3Service: S3Service,
  ) {}

  async uploadDocument(
    countyId: string,
    userId: string,
    applicationId: string,
    docType: string,
    file: UploadedDocumentFile,
  ) {
    await this.ensureApplicantApplication(countyId, userId, applicationId);

    const normalizedDocType = this.normalizeDocType(docType);
    this.validateUpload(file);
    const s3Key = this.generateS3Key(userId, applicationId, normalizedDocType, file.originalname);

    await this.s3Service.uploadObject({
      key: s3Key,
      contentType: file.mimetype,
      body: file.buffer,
    });

    const document = await this.prisma.document.create({
      data: {
        applicationId,
        countyId,
        docType: normalizedDocType,
        s3Key,
        originalName: file.originalname,
        contentType: file.mimetype,
        fileSizeBytes: file.size,
        scanStatus: 'PENDING',
      },
    });

    await this.queueService.getVirusScanQueue().add('scan', {
      documentId: document.id,
      fileName: file.originalname,
      filePath: s3Key,
    });

    return this.mapDocument(document);
  }

  async getDocument(countyId: string, userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        countyId,
        application: { applicantId: userId },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.mapDocument(document);
  }

  async listDocuments(countyId: string, userId: string, applicationId: string) {
    await this.ensureApplicantApplication(countyId, userId, applicationId);

    const documents = await this.prisma.document.findMany({
      where: { applicationId, countyId },
      orderBy: { uploadedAt: 'desc' },
    });

    return Promise.all(documents.map((document) => this.mapDocument(document)));
  }

  async updateScanStatus(documentId: string, scanStatus: 'CLEAN' | 'INFECTED' | 'FAILED') {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { scanStatus, scanCompletedAt: new Date() },
    });
  }

  private async mapDocument(document: StoredDocument) {
    const signedDownload = await this.s3Service.getSignedDownloadUrl(document.s3Key);

    return {
      id: document.id,
      applicationId: document.applicationId,
      docType: document.docType,
      originalName: document.originalName,
      contentType: document.contentType,
      fileSizeBytes: document.fileSizeBytes,
      scanStatus: document.scanStatus,
      scanCompletedAt: document.scanCompletedAt,
      uploadedAt: document.uploadedAt,
      downloadUrl: signedDownload.url,
      downloadExpiresAt: signedDownload.expiresAt,
    };
  }

  private normalizeDocType(docType: string): string {
    const normalized = docType.trim().toUpperCase();
    if (!ALLOWED_DOCUMENT_TYPES.includes(normalized as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
      throw new BadRequestException('Unsupported document type.');
    }
    return normalized;
  }

  private validateUpload(file: UploadedDocumentFile): void {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException('File exceeds maximum size of 5MB');
    }

    if (
      !ALLOWED_UPLOAD_CONTENT_TYPES.includes(
        file.mimetype as (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Unsupported content type. Allowed: PDF, JPEG, PNG.');
    }
  }

  private async ensureApplicantApplication(
    countyId: string,
    userId: string,
    applicationId: string,
  ): Promise<void> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, countyId, applicantId: userId },
      select: { id: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }
  }

  private generateS3Key(
    userId: string,
    applicationId: string,
    docType: string,
    originalName: string,
  ): string {
    const hash = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName).toLowerCase() || '.bin';
    return path.posix.join(userId, applicationId, `${docType.toLowerCase()}-${hash}${extension}`);
  }
}
