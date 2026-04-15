/**
 * Purpose: Orchestrate document persistence, storage, and scan status updates.
 * Why important: Keeps file handling and application-scoped access rules out of controllers.
 * Used by: DocumentController and the virus-scan queue adapter.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';

type UploadedDocumentFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class DocumentService {
  private readonly documentsDir = path.join(process.cwd(), 'uploads', 'documents');

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    fs.mkdirSync(this.documentsDir, { recursive: true });
  }

  async uploadDocument(
    countyId: string,
    userId: string,
    applicationId: string,
    docType: string,
    file: UploadedDocumentFile,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, countyId, applicantId: userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File exceeds maximum size of 10MB');
    }

    const s3Key = this.generateS3Key(userId, applicationId, file.originalname);
    const filePath = path.join(this.documentsDir, s3Key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        applicationId,
        countyId,
        docType,
        s3Key,
        originalName: file.originalname,
        contentType: file.mimetype,
        fileSizeBytes: file.size,
        scanStatus: 'PENDING',
      },
    });

    await this.queueService.getVirusScanQueue().add('scan', {
      documentId: document.id,
      filePath,
      fileName: file.originalname,
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
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, countyId, applicantId: userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const documents = await this.prisma.document.findMany({
      where: { applicationId, countyId },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents.map((document) => this.mapDocument(document));
  }

  async updateScanStatus(documentId: string, scanStatus: 'CLEAN' | 'INFECTED' | 'FAILED') {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { scanStatus, scanCompletedAt: new Date() },
    });
  }

  private mapDocument(document: {
    id: string;
    applicationId: string;
    docType: string;
    originalName: string | null;
    contentType: string | null;
    fileSizeBytes: number | null;
    scanStatus: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';
    scanCompletedAt: Date | null;
    uploadedAt: Date;
  }) {
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
    };
  }

  private generateS3Key(userId: string, applicationId: string, originalName: string): string {
    const hash = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    return path.join(userId, applicationId, `${hash}${extension}`);
  }
}
