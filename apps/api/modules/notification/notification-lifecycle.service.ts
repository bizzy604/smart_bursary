/**
 * Purpose: Queue and persist workflow SMS notifications for application status transitions.
 * Why important: Ensures transition communications are asynchronous and auditable.
 * Used by: ApplicationSubmissionService, review services, and disbursement services.
 */
import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationDeliveryStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../../queue/queue.service';

export type StatusNotificationInput = {
  countyId: string;
  applicationId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationLifecycleService {
  private readonly logger = new Logger(NotificationLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async queueStatusChange(input: StatusNotificationInput): Promise<void> {
    const application = await this.prisma.application.findFirst({
      where: { id: input.applicationId, countyId: input.countyId },
      select: {
        id: true,
        countyId: true,
        submissionReference: true,
        applicantId: true,
        applicant: {
          select: {
            phone: true,
            profile: { select: { fullName: true, phone: true } },
          },
        },
      },
    });

    if (!application) {
      return;
    }

    const recipientPhone = application.applicant.phone ?? application.applicant.profile?.phone ?? null;
    const recipientName = application.applicant.profile?.fullName ?? 'Applicant';
    const messageText = this.buildMessage({
      eventType: input.eventType,
      reference: application.submissionReference ?? application.id,
      recipientName,
      toStatus: input.toStatus ?? null,
    });

    const delivery = await this.prisma.notificationDelivery.create({
      data: {
        countyId: application.countyId,
        applicationId: application.id,
        recipientUserId: application.applicantId,
        channel: NotificationChannel.SMS,
        eventType: input.eventType,
        recipientPhone,
        messageText,
        status: recipientPhone ? NotificationDeliveryStatus.QUEUED : NotificationDeliveryStatus.FAILED,
        failureReason: recipientPhone ? null : 'Recipient has no verified phone number.',
        failedAt: recipientPhone ? null : new Date(),
        metadata: {
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          ...(input.metadata ?? {}),
        } as Prisma.InputJsonValue,
      },
      select: { id: true, status: true },
    });

    if (delivery.status === NotificationDeliveryStatus.FAILED) {
      return;
    }

    try {
      const jobId = await this.queueService.getSmsQueue().add('send-status-sms', {
        deliveryId: delivery.id,
      });

      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { queueJobId: jobId },
      });
    } catch (error: unknown) {
      const failureReason = this.resolveErrorMessage(error);
      this.logger.error(`Failed to enqueue SMS notification ${delivery.id}: ${failureReason}`);

      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          failureReason,
          failedAt: new Date(),
        },
      });
    }
  }

  private buildMessage(input: {
    eventType: string;
    reference: string;
    recipientName: string;
    toStatus: string | null;
  }): string {
    const opening = `Dear ${input.recipientName},`;

    switch (input.eventType) {
      case 'APPLICATION_SUBMITTED':
        return `${opening} your bursary application ${input.reference} was submitted successfully.`;
      case 'WARD_REVIEW_RECOMMENDED':
        return `${opening} application ${input.reference} was recommended by the ward committee and moved to county review.`;
      case 'WARD_REVIEW_RETURNED':
        return `${opening} application ${input.reference} was returned by the ward committee for updates.`;
      case 'WARD_REVIEW_REJECTED':
        return `${opening} application ${input.reference} was declined at ward review.`;
      case 'COUNTY_REVIEW_APPROVED':
        return `${opening} application ${input.reference} has been approved by the county bursary office.`;
      case 'COUNTY_REVIEW_REJECTED':
        return `${opening} application ${input.reference} was not approved by the county bursary office.`;
      case 'COUNTY_REVIEW_WAITLISTED':
        return `${opening} application ${input.reference} has been waitlisted pending available budget.`;
      case 'DISBURSEMENT_SUCCESS':
        return `${opening} disbursement for application ${input.reference} was completed successfully.`;
      case 'DISBURSEMENT_INITIATED':
        return `${opening} application ${input.reference} has been queued for disbursement processing.`;
      case 'DISBURSEMENT_RETRY_QUEUED':
        return `${opening} payment retry for application ${input.reference} has been queued by the finance team.`;
      case 'DISBURSEMENT_MANUAL_INTERVENTION_REQUIRED':
        return `${opening} payment for application ${input.reference} is delayed and requires finance team follow-up.`;
      default:
        return `${opening} application ${input.reference} status changed to ${input.toStatus ?? 'UPDATED'}.`;
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown queue error';
  }
}
