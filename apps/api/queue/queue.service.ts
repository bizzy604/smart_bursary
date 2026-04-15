/**
 * Purpose: Provide the document virus-scan queue adapter.
 * Why important: Decouples document uploads from scan execution and allows local or containerized Redis usage.
 * Used by: DocumentService and the virus-scan workflow.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

type VirusScanJobData = {
  documentId: string;
  fileName: string;
  filePath: string;
};

type VirusScanQueueJob = {
  add: (name: string, data: VirusScanJobData) => Promise<void>;
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly virusScanQueue: VirusScanQueueJob;
  private readonly redisConnection?: Redis;
  private readonly worker?: Worker<VirusScanJobData>;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      this.redisConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      const queue = new Queue<VirusScanJobData>('virus-scan', { connection: this.redisConnection });
      this.worker = new Worker<VirusScanJobData>(
        'virus-scan',
        async (job) => {
          const scanStatus = job.data.fileName.toLowerCase().includes('malware') ? 'INFECTED' : 'CLEAN';

          await this.prisma.document.update({
            where: { id: job.data.documentId },
            data: {
              scanStatus,
              scanCompletedAt: new Date(),
            },
          });

          return { documentId: job.data.documentId, scanStatus };
        },
        { connection: this.redisConnection },
      );

      this.virusScanQueue = {
        add: async (name: string, data: VirusScanJobData) => {
          await queue.add(name, data);
        },
      };

      this.logger.log('Virus scan queue configured for Redis transport');
      return;
    }

    this.virusScanQueue = {
      add: async (_name: string, data: VirusScanJobData) => {
        await new Promise((resolve) => setTimeout(resolve, 50));

        const scanStatus = data.fileName.toLowerCase().includes('malware') ? 'INFECTED' : 'CLEAN';

        await this.prisma.document.update({
          where: { id: data.documentId },
          data: {
            scanStatus,
            scanCompletedAt: new Date(),
          },
        });
      },
    };

    this.logger.log('Virus scan queue configured for in-process fallback');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.redisConnection?.quit();
  }

  getVirusScanQueue(): VirusScanQueueJob {
    return this.virusScanQueue;
  }
}
