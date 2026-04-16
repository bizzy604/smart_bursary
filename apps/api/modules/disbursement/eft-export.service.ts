/**
 * Purpose: Generate RTGS-friendly EFT batch exports from approved disbursement data.
 * Why important: Finance teams need a deterministic bank export format for manual processing.
 * Used by: Disbursement workflows and future county finance download endpoints.
 */
import { Injectable } from '@nestjs/common';

export type RtgsExportRow = {
	recipientName: string;
	bankName: string;
	bankAccount: string;
	amountKes: number;
	reference: string;
};

@Injectable()
export class EftExportService {
	generateRtgsFile(rows: RtgsExportRow[]): Buffer {
		const header = ['Recipient Name', 'Bank Name', 'Bank Account', 'Amount (KES)', 'Reference'];
		const lines = [header, ...rows.map((row) => [row.recipientName, row.bankName, row.bankAccount, row.amountKes.toFixed(2), row.reference])];
		const csv = lines.map((columns) => columns.map((value) => this.escapeCsv(String(value))).join(',')).join('\n');
		return Buffer.from(csv, 'utf8');
	}

	private escapeCsv(value: string): string {
		if (/[",\n]/.test(value)) {
			return `"${value.replaceAll('"', '""')}"`;
		}

		return value;
	}
}
