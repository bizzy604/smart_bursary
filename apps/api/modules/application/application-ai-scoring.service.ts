/**
 * Purpose: Queue AI scoring jobs and persist queue lifecycle timeline events.
 * Why important: Keeps AI dispatch concerns separate from submission validation logic.
 * Used by: ApplicationSubmissionService submit workflow.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';

@Injectable()
export class ApplicationAiScoringService {
  private readonly logger = new Logger(ApplicationAiScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async enqueue(applicationId: string, countyId: string, status: string): Promise<void> {
    try {
      await this.queueService.getAiScoringQueue().add('score-application', {
        applicationId,
        countyId,
      });

      await this.safeRecordTimeline(
        applicationId,
        countyId,
        'AI_SCORING_QUEUED',
        status,
        'AI scoring job queued successfully.',
      );
    } catch (error) {
      const message = this.resolveErrorMessage(error);
      this.logger.error(`Failed to enqueue AI scoring for application ${applicationId}: ${message}`);

      await this.safeRecordTimeline(
        applicationId,
        countyId,
        'AI_SCORING_QUEUE_FAILED',
        status,
        message,
      );
    }
  }

  private async safeRecordTimeline(
    applicationId: string,
    countyId: string,
    eventType: string,
    status: string,
    message: string,
  ): Promise<void> {
    try {
      await this.prisma.applicationTimeline.create({
        data: {
          applicationId,
          countyId,
          eventType,
          fromStatus: status,
          toStatus: status,
          metadata: {
            message,
            queue: 'ai-scoring',
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist timeline event ${eventType} for application ${applicationId}: ${this.resolveErrorMessage(error)}`,
      );
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
