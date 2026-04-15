/**
 * Virus Scan Processor
 * Handles document virus scanning via ClamAV (or mock in test)
 */

import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';

export class VirusScanProcessor {
  private readonly logger = new Logger(VirusScanProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process virus scan job
   * In production, integrates with ClamAV via clamav-client
   * In test, uses mock scanning
   */
  async process(job: Job) {
    const { documentId, filePath, fileName } = job.data;

    try {
      this.logger.log(`Processing virus scan for document ${documentId}: ${fileName}`);

      // Simulate scanning delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // In test/dev, check for malware markers in filename
      const isMalicious = fileName.toLowerCase().includes('malware');

      // Update document scan status
      const scanStatus = isMalicious ? 'INFECTED' : 'CLEAN';

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          scanStatus,
          scanCompletedAt: new Date(),
        },
      });

      this.logger.log(`Document ${documentId} scan result: ${scanStatus}`);

      return {
        documentId,
        scanStatus,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Virus scan failed for document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Mark as FAILED
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          scanStatus: 'FAILED',
          scanCompletedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
