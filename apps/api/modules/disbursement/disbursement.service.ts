/**
 * Purpose: Orchestrate M-Pesa B2C and bank EFT disbursements, track transaction status.
 * Why important: Core business logic for payment execution and reconciliation.
 * Used by: DisbursementController.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DisbursementMethod, DisbursementStatus } from '@prisma/client';

@Injectable()
export class DisbursementService {
	constructor(private readonly prisma: PrismaService) {}

	async initiateDisbursement(data: {
		applicationId: string;
		countyId: string;
		disbursementMethod: DisbursementMethod;
		recipientPhone?: string;
		initiatedBy: string;
	}) {
		const application = await this.prisma.application.findUniqueOrThrow({
			where: { id: data.applicationId },
			select: {
				id: true,
				countyId: true,
				status: true,
				programId: true,
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

		const disbursement = await (this.prisma.disbursementRecord as any).createUnchecked({
			data: {
				applicationId: data.applicationId,
				countyId: data.countyId,
				programId: application.programId,
				disbursementMethod: data.disbursementMethod,
				amountKes: allocatedAmount,
				recipientPhone: data.recipientPhone || application.applicant?.phone,
				status: DisbursementStatus.PENDING,
				initiatedBy: data.initiatedBy,
			},
		});

		return { disbursementId: disbursement.id, amount: Number(allocatedAmount), status: disbursement.status };
	}

	async listDisbursements(countyId: string, filters?: { status?: string }) {
		const disbursements = await this.prisma.disbursementRecord.findMany({
			where: {
				countyId,
				...(filters?.status && { status: filters.status as DisbursementStatus }),
			},
			include: {
				application: {
					select: {
						applicant: {
							select: {
								profile: { select: { fullName: true } },
							},
						},
					},
				},
			},
			orderBy: { initiatedAt: 'desc' },
			take: 100,
		});

		return disbursements.map((d) => ({
			id: d.id,
			applicationId: d.applicationId,
			status: d.status,
			disbursementMethod: d.disbursementMethod,
			amount: Number(d.amountKes),
			recipientName: d.application?.applicant?.profile?.fullName || 'Unknown',
			initiatedAt: d.initiatedAt,
		}));
	}

	async getDisbursementDetail(disbursementId: string, countyId: string) {
		const disbursement = await this.prisma.disbursementRecord.findUniqueOrThrow({
			where: { id: disbursementId },
			include: {
				application: {
					select: {
						id: true,
						applicant: {
							select: {
								profile: { select: { fullName: true } },
							},
						},
					},
				},
			},
		});

		if (disbursement.countyId !== countyId) {
			throw new BadRequestException('Access denied to this disbursement.');
		}

		return disbursement;
	}

	async updateTransactionStatus(
		disbursementId: string,
		status: DisbursementStatus,
		transactionId?: string,
		failureReason?: string,
	) {
		const disbursement = await this.prisma.disbursementRecord.findUniqueOrThrow({
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
