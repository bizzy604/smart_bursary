/**
 * Purpose: Orchestrate M-Pesa B2C and bank EFT disbursements, track transaction status.
 * Why important: Core business logic for payment execution and reconciliation.
 * Used by: DisbursementController.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DisbursementMethod, DisbursementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

import { DisbursementQueueService } from './disbursement-queue.service';

@Injectable()
export class DisbursementService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly disbursementQueueService: DisbursementQueueService,
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

		if (application.status !== 'APPROVED') {
			throw new BadRequestException('Application must be approved before disbursement.');
		}

		const allocatedAmount = application.reviews[0]?.allocatedAmount;
		if (!allocatedAmount) {
			throw new BadRequestException('No allocated amount found for this application.');
		}

		const resolvedPhone = data.recipientPhone || application.applicant?.phone;
		const disbursementData: Prisma.DisbursementRecordUncheckedCreateInput = {
			applicationId: data.applicationId,
			countyId: data.countyId,
			programId: application.programId,
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
			select: { id: true, countyId: true, status: true },
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
		await this.prisma.disbursementRecord.findUniqueOrThrow({
			where: { id: disbursementId },
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

		await this.prisma.disbursementRecord.update({
			where: { id: disbursementId },
			data: updateData,
		});
	}
}
