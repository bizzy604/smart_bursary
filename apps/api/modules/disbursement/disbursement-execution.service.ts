/**
 * Purpose: Execute disbursement attempts and persist success/failure lifecycle state.
 * Why important: Centralizes retry counters, status transitions, and escalation rules.
 * Used by: DisbursementQueueService and manual disbursement retry workflows.
 */
import { Injectable, Logger } from '@nestjs/common';
import { DisbursementMethod, DisbursementStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MpesaService } from './mpesa.service';

export type DisbursementExecutionResult = {
	disbursementId: string;
	status: 'SUCCESS' | 'FAILED_RETRY' | 'FAILED_TERMINAL' | 'SKIPPED';
	retryCount: number;
	failureReason?: string;
};

@Injectable()
export class DisbursementExecutionService {
	private readonly logger = new Logger(DisbursementExecutionService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly mpesaService: MpesaService,
	) {}

	async execute(disbursementId: string): Promise<DisbursementExecutionResult> {
		const disbursement = await this.prisma.disbursementRecord.findUnique({
			where: { id: disbursementId },
			include: {
				application: {
					select: {
						id: true,
						status: true,
						countyId: true,
						submissionReference: true,
					},
				},
			},
		});

		if (!disbursement) {
			return { disbursementId, status: 'SKIPPED', retryCount: 0 };
		}

		if (disbursement.status === DisbursementStatus.SUCCESS) {
			return {
				disbursementId,
				status: 'SKIPPED',
				retryCount: disbursement.retryCount,
			};
		}

		if (disbursement.disbursementMethod !== DisbursementMethod.MPESA_B2C) {
			return {
				disbursementId,
				status: 'SKIPPED',
				retryCount: disbursement.retryCount,
			};
		}

		if (!disbursement.recipientPhone) {
			return this.recordFailure(disbursement, 'Recipient phone is required for M-Pesa disbursement.');
		}

		try {
			const result = await this.mpesaService.executeB2C({
				applicationId: disbursement.applicationId,
				disbursementId: disbursement.id,
				phoneNumber: disbursement.recipientPhone,
				amountKes: Number(disbursement.amountKes),
				reference:
					disbursement.application.submissionReference ??
					this.mpesaService.buildReference(disbursement.applicationId, disbursement.id),
			});

			await this.prisma.$transaction(async (transaction) => {
				await transaction.disbursementRecord.update({
					where: { id: disbursement.id },
					data: {
						status: DisbursementStatus.SUCCESS,
						transactionId: result.transactionId,
						confirmedAt: new Date(),
						failureReason: null,
					},
				});

				await transaction.application.update({
					where: { id: disbursement.applicationId },
					data: { status: 'DISBURSED' },
				});

				await this.recordTimelineEvent(
					transaction,
					disbursement,
					'DISBURSEMENT_SUCCESS',
					disbursement.application.status,
					'DISBURSED',
					{ transactionId: result.transactionId },
				);
			});

			return { disbursementId: disbursement.id, status: 'SUCCESS', retryCount: disbursement.retryCount };
		} catch (error) {
			const message = this.resolveErrorMessage(error);
			this.logger.error(`Disbursement execution failed for ${disbursement.id}: ${message}`);
			return this.recordFailure(disbursement, message);
		}
	}

	private async recordFailure(
		disbursement: {
			id: string;
			applicationId: string;
			countyId: string;
			retryCount: number;
			application: { status: string };
		},
		failureReason: string,
	): Promise<DisbursementExecutionResult> {
		const nextRetryCount = disbursement.retryCount + 1;
		const terminalFailure = nextRetryCount >= 3;

		await this.prisma.$transaction(async (transaction) => {
			await transaction.disbursementRecord.update({
				where: { id: disbursement.id },
				data: {
					status: DisbursementStatus.FAILED,
					failureReason,
					retryCount: nextRetryCount,
				},
			});

			await this.recordTimelineEvent(
				transaction,
				disbursement,
				'DISBURSEMENT_FAILED',
				disbursement.application.status,
				disbursement.application.status,
				{ retryCount: nextRetryCount, failureReason },
			);

			if (terminalFailure) {
				await this.recordTimelineEvent(
					transaction,
					disbursement,
					'DISBURSEMENT_MANUAL_INTERVENTION_REQUIRED',
					disbursement.application.status,
					disbursement.application.status,
					{ retryCount: nextRetryCount, failureReason },
				);
			}
		});

		return {
			disbursementId: disbursement.id,
			status: terminalFailure ? 'FAILED_TERMINAL' : 'FAILED_RETRY',
			retryCount: nextRetryCount,
			failureReason,
		};
	}

	private async recordTimelineEvent(
		transaction: Prisma.TransactionClient,
		disbursement: { applicationId: string; countyId: string; id: string },
		eventType: string,
		fromStatus: string,
		toStatus: string,
		metadata: Record<string, unknown>,
	): Promise<void> {
		await transaction.applicationTimeline.create({
			data: {
				applicationId: disbursement.applicationId,
				countyId: disbursement.countyId,
				eventType,
				fromStatus,
				toStatus,
				metadata: {
					disbursementId: disbursement.id,
					...metadata,
				} as Prisma.InputJsonValue,
			},
		});
	}

	private resolveErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}

		return 'Unknown disbursement error';
	}
}
