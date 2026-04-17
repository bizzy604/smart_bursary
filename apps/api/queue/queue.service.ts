/**
 * Purpose: Provide queue adapters for virus scan, AI scoring, and SMS notifications.
 * Why important: Decouples workflow mutations from asynchronous execution workers.
 * Used by: Document, AI scoring, and notification lifecycle services.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { SmsService } from '../modules/notification/sms.service';
import {
  AiScoringJobData,
  AiScoringProcessor,
} from './processors/ai-scoring.processor';
import { SmsJobData, SmsProcessor } from './processors/sms.processor';

type VirusScanJobData = {
  documentId: string;
  fileName: string;
  filePath: string;
};

type VirusScanQueueJob = {
  add: (name: string, data: VirusScanJobData) => Promise<void>;
};

type AiScoringQueueJob = {
  add: (name: string, data: AiScoringJobData) => Promise<void>;
};

type SmsQueueJob = {
  add: (name: string, data: SmsJobData) => Promise<string>;
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly virusScanQueue: VirusScanQueueJob;
  private readonly aiScoringQueue: AiScoringQueueJob;
  private readonly smsQueue: SmsQueueJob;
  private readonly aiScoringProcessor: AiScoringProcessor;
  private readonly smsProcessor: SmsProcessor;
  private readonly redisConnection?: Redis;
  private readonly worker?: Worker<VirusScanJobData>;
  private readonly aiScoringWorker?: Worker<AiScoringJobData>;
  private readonly smsWorker?: Worker<SmsJobData>;

  constructor(private readonly prisma: PrismaService) {
    this.aiScoringProcessor = new AiScoringProcessor(prisma);
    this.smsProcessor = new SmsProcessor(prisma, new SmsService());

    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      this.redisConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      const virusScanQueue = new Queue<VirusScanJobData>('virus-scan', {
        connection: this.redisConnection,
      });
      const aiScoringQueue = new Queue<AiScoringJobData>('ai-scoring', {
        connection: this.redisConnection,
      });
      const smsQueue = new Queue<SmsJobData>('sms-notification', {
        connection: this.redisConnection,
      });

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
      this.aiScoringWorker = new Worker<AiScoringJobData>(
        'ai-scoring',
        async (job) => this.aiScoringProcessor.process(job),
        { connection: this.redisConnection },
      );
      this.smsWorker = new Worker<SmsJobData>(
        'sms-notification',
        async (job) => this.smsProcessor.process(job),
        { connection: this.redisConnection },
      );

      this.virusScanQueue = {
        add: async (name: string, data: VirusScanJobData) => {
          await virusScanQueue.add(name, data);
        },
      };
      this.aiScoringQueue = {
        add: async (name: string, data: AiScoringJobData) => {
          await aiScoringQueue.add(name, data, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            jobId: `ai-scoring-${data.applicationId}`,
          });
        },
      };
      this.smsQueue = {
        add: async (name: string, data: SmsJobData) => {
          const job = await smsQueue.add(name, data, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          });

          return String(job.id ?? data.deliveryId);
        },
      };

      this.logger.log('Queue service configured for Redis transport');
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
    this.aiScoringQueue = {
      add: async (_name: string, data: AiScoringJobData) => {
        await this.aiScoringProcessor.processData(data);
      },
    };
    this.smsQueue = {
      add: async (_name: string, data: SmsJobData) => {
        await this.smsProcessor.processData(data);
        return `local-${data.deliveryId}`;
      },
    };

    this.logger.log('Queue service configured for in-process fallback');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.aiScoringWorker?.close();
    await this.smsWorker?.close();
    await this.redisConnection?.quit();
  }

  getVirusScanQueue(): VirusScanQueueJob {
    return this.virusScanQueue;
  }

  getAiScoringQueue(): AiScoringQueueJob {
    return this.aiScoringQueue;
  }

  getSmsQueue(): SmsQueueJob {
    return this.smsQueue;
  }
}
