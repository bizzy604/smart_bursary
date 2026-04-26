/**
 * Purpose: Orchestrate M-Pesa B2C and bank EFT disbursements, track transaction status.
 * Why important: Core business logic for payment execution and reconciliation.
 * Used by: DisbursementController.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DisbursementMethod, DisbursementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DisbursementQueueService } from './disbursement-queue.service';
import { NotificationLifecycleService } from '../notification/notification-lifecycle.service';

@Injectable()
export class DisbursementService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly disbursementQueueService: DisbursementQueueService,
		private readonly notificationLifecycleService: NotificationLifecycleService,
	) {}

	async initiateDisbursement(data: {
		applicationId: string;
		countyId: string;
		disbursementMethod: DisbursementMethod;
		recipientPhone?: string;
		initiatedBy: string;
	}) {
		const existing = await this.prisma.disbursementRecord.findUnique({
			where: { applicationId: data.applicationId },
			select: { id: true },
		});
		if (existing) {
			throw new BadRequestException('Disbursement already exists for this application.');
		}

		const application = await this.prisma.application.findUniqueOrThrow({
			where: { id: data.applicationId },
			select: {
				id: true,
				countyId: true,
				status: true,
				programId: true,
				submissionReference: true,
				amountAllocated: true,
				villageBudgetAllocationId: true,
				wardBudgetAllocationId: true,
				applicant: { select: { phone: true } },
				reviews: {
					where: { stage: 'COUNTY_REVIEW' },
					select: { allocatedAmount: true },
				},
			},
		});

		if (application.countyId !== data.countyId) {
			throw new BadRequestException('Application not in this county.');
		}

		if (application.status !== 'APPROVED' && application.status !== 'ALLOCATED') {
			throw new BadRequestException('Application must be approved or allocated before disbursement.');
		}

		// Resolve the allocated amount: prefer the new flow's `application.amountAllocated`
		// (set by StudentAllocationService) and fall back to the legacy `applicationReview.allocatedAmount`
		// so existing programs without ward distribution still disburse correctly.
		const allocatedAmount =
			application.amountAllocated ?? application.reviews[0]?.allocatedAmount ?? null;
		if (!allocatedAmount) {
			throw new BadRequestException('No allocated amount found for this application.');
		}

		const resolvedPhone = data.recipientPhone || application.applicant?.phone;
		const disbursementData: Prisma.DisbursementRecordUncheckedCreateInput = {
			applicationId: data.applicationId,
			countyId: data.countyId,
			programId: application.programId,
			// FK chain back to the authorising allocations (§7.6 of design doc).
			// Null for legacy single-stage applications; the CHECK constraint allows
			// null only while status = PENDING.
			villageBudgetAllocationId: application.villageBudgetAllocationId,
			wardBudgetAllocationId: application.wardBudgetAllocationId,
			disbursementMethod: data.disbursementMethod,
			amountKes: allocatedAmount,
			recipientPhone: resolvedPhone,
			status: DisbursementStatus.PENDING,
			initiatedBy: data.initiatedBy,
		};

		const disbursement = await this.prisma.disbursementRecord.create({
			data: disbursementData,
		});

		if (data.disbursementMethod === DisbursementMethod.MPESA_B2C) {
			if (!resolvedPhone) {
				throw new BadRequestException('Recipient phone is required for M-Pesa disbursement.');
			}
			await this.disbursementQueueService.enqueue(disbursement.id);
		}

		await this.notificationLifecycleService.queueStatusChange({
			countyId: data.countyId,
			applicationId: data.applicationId,
			eventType: 'DISBURSEMENT_INITIATED',
			fromStatus: 'APPROVED',
			toStatus: 'APPROVED',
			metadata: {
				disbursementId: disbursement.id,
				method: data.disbursementMethod,
			},
		});

		return {
			disbursementId: disbursement.id,
			amount: Number(allocatedAmount),
			status: disbursement.status,
			queued: data.disbursementMethod === DisbursementMethod.MPESA_B2C,
			estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
			reference: application.submissionReference,
		};
	}

	async retryDisbursement(disbursementId: string, countyId: string) {
		const disbursement = await this.prisma.disbursementRecord.findUnique({
			where: { id: disbursementId },
			select: { id: true, countyId: true, status: true, applicationId: true },
		});

		if (!disbursement) {
			throw new NotFoundException('Disbursement not found.');
		}

		if (disbursement.countyId !== countyId) {
			throw new BadRequestException('Access denied to this disbursement.');
		}

		if (disbursement.status !== DisbursementStatus.FAILED) {
			throw new BadRequestException('Only failed disbursements can be retried manually.');
		}

		await this.prisma.disbursementRecord.update({
			where: { id: disbursementId },
			data: {
				status: DisbursementStatus.PENDING,
				failureReason: null,
				retryCount: 0,
				confirmedAt: null,
			},
		});

		await this.disbursementQueueService.enqueue(disbursementId);
		await this.notificationLifecycleService.queueStatusChange({
			countyId,
			applicationId: disbursement.applicationId,
			eventType: 'DISBURSEMENT_RETRY_QUEUED',
			fromStatus: 'APPROVED',
			toStatus: 'APPROVED',
			metadata: { disbursementId },
		});
		return {
			disbursementId,
			status: DisbursementStatus.PENDING,
			queued: true,
		};
	}

	async updateTransactionStatus(
		disbursementId: string,
		status: DisbursementStatus,
		transactionId?: string,
		failureReason?: string,
	) {
		const disbursement = await this.prisma.disbursementRecord.findUniqueOrThrow({
			where: { id: disbursementId },
			select: {
				countyId: true,
				applicationId: true,
				amountKes: true,
				status: true,
				villageBudgetAllocationId: true,
				wardBudgetAllocationId: true,
			},
		});

		const updateData: any = { status };
		if (transactionId) {
			updateData.transactionId = transactionId;
		}
		if (failureReason) {
			updateData.failureReason = failureReason;
		}
		if (status === DisbursementStatus.SUCCESS) {
			updateData.confirmedAt = new Date();
		}

		// On a SUCCESS confirmation, propagate the disbursed amount up the FK chain so the
		// invariants `disbursed_total_kes ≤ allocated_total_kes ≤ allocated_kes` stay valid
		// at both village and ward levels. We do this only when transitioning INTO SUCCESS
		// from a non-SUCCESS state to keep the propagation idempotent across retries.
		const transitioningToSuccess =
			status === DisbursementStatus.SUCCESS && disbursement.status !== DisbursementStatus.SUCCESS;

		await this.prisma.$transaction(async (tx) => {
			await tx.disbursementRecord.update({
				where: { id: disbursementId },
				data: updateData,
			});

			if (transitioningToSuccess) {
				const amount = disbursement.amountKes;
				if (disbursement.villageBudgetAllocationId) {
					await tx.villageBudgetAllocation.update({
						where: { id: disbursement.villageBudgetAllocationId },
						data: { disbursedTotalKes: { increment: amount } },
					});
				}
				if (disbursement.wardBudgetAllocationId) {
					await tx.wardBudgetAllocation.update({
						where: { id: disbursement.wardBudgetAllocationId },
						data: { disbursedTotalKes: { increment: amount } },
					});
				}
			}
		}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

		if (status === DisbursementStatus.SUCCESS) {
			await this.notificationLifecycleService.queueStatusChange({
				countyId: disbursement.countyId,
				applicationId: disbursement.applicationId,
				eventType: 'DISBURSEMENT_SUCCESS',
				fromStatus: 'APPROVED',
				toStatus: 'DISBURSED',
				metadata: { disbursementId, transactionId },
			});
		} else if (status === DisbursementStatus.FAILED) {
			await this.notificationLifecycleService.queueStatusChange({
				countyId: disbursement.countyId,
				applicationId: disbursement.applicationId,
				eventType: 'DISBURSEMENT_MANUAL_INTERVENTION_REQUIRED',
				fromStatus: 'APPROVED',
				toStatus: 'APPROVED',
				metadata: { disbursementId, failureReason },
			});
		}
	}
}
