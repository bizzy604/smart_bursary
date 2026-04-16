/**
 * Purpose: Build human-readable disbursement receipts for county finance records.
 * Why important: Receipts provide a durable audit trail for payment execution and reconciliation.
 * Used by: Disbursement workflows and future receipt download endpoints.
 */
import { Injectable } from '@nestjs/common';

export type DisbursementReceiptInput = {
	disbursementId: string;
	recipientName: string;
	amountKes: number;
	method: string;
	transactionId?: string | null;
	confirmedAt?: Date | null;
};

@Injectable()
export class ReceiptService {
	buildReceiptBuffer(receipt: DisbursementReceiptInput): Buffer {
		const lines = [
			'KauntyBursary Disbursement Receipt',
			`Receipt ID: ${receipt.disbursementId}`,
			`Recipient: ${receipt.recipientName}`,
			`Amount (KES): ${receipt.amountKes.toFixed(2)}`,
			`Method: ${receipt.method}`,
			`Transaction ID: ${receipt.transactionId ?? 'N/A'}`,
			`Confirmed At: ${receipt.confirmedAt ? receipt.confirmedAt.toISOString() : 'Pending'}`,
		];

		return Buffer.from(lines.join('\n'), 'utf8');
	}
}
