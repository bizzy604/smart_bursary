/**
 * Purpose: Execute queued SMS delivery jobs and persist delivery outcomes.
 * Why important: Keeps notification sending asynchronous while maintaining audit visibility.
 * Used by: QueueService sms worker and in-process queue fallback.
 */
import { Logger } from '@nestjs/common';
import { NotificationDeliveryStatus } from '@prisma/client';
import { Job } from 'bullmq';

import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../modules/notification/sms.service';

export type SmsJobData = {
	deliveryId: string;
};

export class SmsProcessor {
	private readonly logger = new Logger(SmsProcessor.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly smsService: SmsService,
	) {}

	async process(job: Job<SmsJobData>): Promise<void> {
		await this.processData(job.data);
	}

	async processData(data: SmsJobData): Promise<void> {
		const delivery = await this.prisma.notificationDelivery.findUnique({
			where: { id: data.deliveryId },
			select: {
				id: true,
				countyId: true,
				eventType: true,
				recipientPhone: true,
				messageText: true,
				attemptCount: true,
			},
		});

		if (!delivery || !delivery.recipientPhone) {
			return;
		}

		try {
			const result = await this.smsService.send({
				to: delivery.recipientPhone,
				message: delivery.messageText,
				eventType: delivery.eventType,
				countyId: delivery.countyId,
			});

			await this.prisma.notificationDelivery.update({
				where: { id: delivery.id },
				data: {
					status: NotificationDeliveryStatus.SENT,
					providerMessageId: result.providerMessageId,
					attemptCount: delivery.attemptCount + 1,
					sentAt: new Date(),
					failureReason: null,
					failedAt: null,
				},
			});
		} catch (error: unknown) {
			const failureReason = this.resolveErrorMessage(error);
			this.logger.warn(`SMS delivery failed for ${delivery.id}: ${failureReason}`);

			await this.prisma.notificationDelivery.update({
				where: { id: delivery.id },
				data: {
					status: NotificationDeliveryStatus.FAILED,
					failureReason,
					attemptCount: delivery.attemptCount + 1,
					failedAt: new Date(),
				},
			});
		}
	}

	private resolveErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown SMS error';
	}
}
