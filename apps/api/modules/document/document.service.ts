/**
 * Purpose: Orchestrate document persistence, storage, and access rules.
 * Why important: Keeps file handling and application-scoped access rules out of controllers.
 * Used by: DocumentController and tenant branding surfaces.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
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

type DocumentActor = {
  userId: string;
  role: UserRole;
  wardId: string | null;
};

type ScopedApplication = {
  id: string;
  applicantId: string;
  wardId: string;
};

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
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

    return this.mapDocument(document);
  }

  async getDocument(countyId: string, actor: DocumentActor, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, countyId },
      include: { application: { select: { id: true, applicantId: true, wardId: true } } },
    });

    if (!document || !document.application) {
      throw new NotFoundException('Document not found');
    }

    this.assertDocumentAccess(document.application as ScopedApplication, actor);

    return this.mapDocument(document);
  }

  async listDocuments(countyId: string, actor: DocumentActor, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, countyId },
      select: { id: true, applicantId: true, wardId: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.assertDocumentAccess(application as ScopedApplication, actor);

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

  private assertDocumentAccess(application: ScopedApplication, actor: DocumentActor) {
    if (actor.role === UserRole.STUDENT) {
      if (actor.userId !== application.applicantId) {
        throw new ForbiddenException('Students can only access their own documents.');
      }
      return;
    }

    if (actor.role === UserRole.WARD_ADMIN || actor.role === UserRole.VILLAGE_ADMIN) {
      if (!actor.wardId || actor.wardId !== application.wardId) {
        throw new ForbiddenException('Ward admins can only access documents for applications in their ward.');
      }
      return;
    }

    if (actor.role === UserRole.FINANCE_OFFICER || actor.role === UserRole.COUNTY_ADMIN || actor.role === UserRole.PLATFORM_OPERATOR) {
      return;
    }

    throw new ForbiddenException('Role is not allowed to access documents.');
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

  async uploadCountyLogo(
    countyId: string,
    file: UploadedDocumentFile,
  ): Promise<{ s3Key: string }> {
    this.validateUpload(file);
    const extension = path.extname(file.originalname).toLowerCase() || '.png';
    const s3Key = path.posix.join('county-assets', countyId, `logo-${crypto.randomBytes(8).toString('hex')}${extension}`);

    await this.s3Service.uploadObject({
      key: s3Key,
      contentType: file.mimetype,
      body: file.buffer,
    });

    return { s3Key };
  }
}
