/**
 * Purpose: Generate downloadable EFT/RTGS export files for approved applications.
 * Why important: Enables finance officers to process batch bank disbursements externally.
 * Used by: DisbursementController batch export endpoint.
 */
import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { EftBatchDto } from './dto/eft-batch.dto';
import { EftExportService } from './eft-export.service';

@Injectable()
export class DisbursementExportService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly eftExportService: EftExportService,
	) {}

	async generateEftBatch(countyId: string, dto: EftBatchDto) {
		const applications = await this.prisma.application.findMany({
			where: {
				id: { in: dto.applicationIds },
				countyId,
				status: 'APPROVED',
			},
			include: {
				applicant: {
					select: {
						profile: { select: { fullName: true } },
						academicInfo: {
							select: { bankName: true, bankAccountNumber: true },
						},
					},
				},
			},
		});

		if (applications.length !== dto.applicationIds.length) {
			throw new BadRequestException('Some applications are missing, not approved, or outside county scope.');
		}

		let totalAmountKes = 0;
		const rows = applications.map((application) => {
			const bankName = application.applicant.academicInfo?.bankName?.trim();
			const bankAccountBytes = application.applicant.academicInfo?.bankAccountNumber;
			const bankAccount = bankAccountBytes
				? Buffer.from(bankAccountBytes).toString('utf8').trim()
				: '';
			if (!bankName || !bankAccount) {
				throw new BadRequestException(
					`Missing bank details for application ${application.id}.`,
				);
			}

			const amount = Number(application.amountAllocated ?? 0);
			if (amount <= 0) {
				throw new BadRequestException(
					`Allocated amount is required for application ${application.id}.`,
				);
			}

			totalAmountKes += amount;
			return {
				recipientName: application.applicant.profile?.fullName ?? 'Unknown Recipient',
				bankName,
				bankAccount,
				amountKes: amount,
				reference: application.submissionReference ?? application.id,
			};
		});

		const buffer = this.eftExportService.generateRtgsFile(rows);
		const batchPrefix = dto.batchName?.trim() || `rtgs-${Date.now()}`;
		return {
			buffer,
			filename: `${batchPrefix}.csv`,
			recordCount: rows.length,
			totalAmountKes: Number(totalAmountKes.toFixed(2)),
		};
	}
}
