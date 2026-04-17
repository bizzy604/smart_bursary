/**
 * Purpose: Provide read/query operations for disbursement records and receipt downloads.
 * Why important: Keeps controller-facing read logic separated from write-side orchestration.
 * Used by: DisbursementController list, detail, and receipt routes.
 */
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ReceiptService } from './receipt.service';

export type DisbursementActor = {
	countyId: string;
	userId: string;
	role: UserRole;
};

@Injectable()
export class DisbursementQueryService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly receiptService: ReceiptService,
	) {}

	async listDisbursements(countyId: string, filters?: { status?: string }) {
		const disbursements = await this.prisma.disbursementRecord.findMany({
			where: {
				countyId,
				...(filters?.status ? { status: filters.status as never } : {}),
			},
			include: {
				application: {
					select: {
						applicant: { select: { profile: { select: { fullName: true } } } },
					},
				},
			},
			orderBy: { initiatedAt: 'desc' },
			take: 100,
		});

		return disbursements.map((item) => ({
			id: item.id,
			applicationId: item.applicationId,
			status: item.status,
			disbursementMethod: item.disbursementMethod,
			amount: Number(item.amountKes),
			retryCount: item.retryCount,
			failureReason: item.failureReason,
			recipientName: item.application?.applicant?.profile?.fullName ?? 'Unknown',
			initiatedAt: item.initiatedAt,
			confirmedAt: item.confirmedAt,
		}));
	}

	async getDisbursementDetail(disbursementId: string, countyId: string) {
		const disbursement = await this.prisma.disbursementRecord.findUniqueOrThrow({
			where: { id: disbursementId },
			include: {
				application: {
					select: {
						id: true,
						applicant: { select: { profile: { select: { fullName: true } } } },
					},
				},
			},
		});

		if (disbursement.countyId !== countyId) {
			throw new ForbiddenException('Access denied to this disbursement.');
		}

		return {
			id: disbursement.id,
			applicationId: disbursement.applicationId,
			status: disbursement.status,
			disbursementMethod: disbursement.disbursementMethod,
			amount: Number(disbursement.amountKes),
			retryCount: disbursement.retryCount,
			failureReason: disbursement.failureReason,
			transactionId: disbursement.transactionId,
			recipientName: disbursement.application?.applicant?.profile?.fullName ?? 'Unknown',
			initiatedAt: disbursement.initiatedAt,
			confirmedAt: disbursement.confirmedAt,
			receiptUrl:
				disbursement.status === 'SUCCESS'
					? `/api/v1/disbursements/${disbursement.id}/receipt`
					: null,
		};
	}

	async getReceiptByDisbursementId(disbursementId: string, actor: DisbursementActor) {
		const disbursement = await this.prisma.disbursementRecord.findUniqueOrThrow({
			where: { id: disbursementId },
			include: {
				application: {
					select: {
						applicantId: true,
						applicant: { select: { profile: { select: { fullName: true } } } },
					},
				},
			},
		});

		this.assertReceiptAccess(disbursement.countyId, disbursement.application?.applicantId ?? '', actor);
		if (disbursement.status !== 'SUCCESS') {
			throw new BadRequestException('Receipt is only available after successful disbursement.');
		}

		const buffer = await this.receiptService.buildReceiptBuffer({
			disbursementId: disbursement.id,
			recipientName: disbursement.application?.applicant?.profile?.fullName ?? 'Unknown',
			amountKes: Number(disbursement.amountKes),
			method: disbursement.disbursementMethod,
			transactionId: disbursement.transactionId,
			confirmedAt: disbursement.confirmedAt,
		});

		return { buffer, filename: `receipt-${disbursement.id}.pdf` };
	}

	async getReceiptByApplicationId(applicationId: string, actor: DisbursementActor) {
		const disbursement = await this.prisma.disbursementRecord.findUniqueOrThrow({
			where: { applicationId },
		});
		return this.getReceiptByDisbursementId(disbursement.id, actor);
	}

	private assertReceiptAccess(countyId: string, applicantId: string, actor: DisbursementActor) {
		if (actor.role === UserRole.STUDENT) {
			if (actor.userId !== applicantId) {
				throw new ForbiddenException('Access denied to this receipt.');
			}
			return;
		}

		if (actor.countyId !== countyId) {
			throw new ForbiddenException('Access denied to this receipt.');
		}
	}
}
