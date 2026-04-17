/**
 * Purpose: Build human-readable disbursement receipts for county finance records.
 * Why important: Receipts provide a durable audit trail for payment execution and reconciliation.
 * Used by: Disbursement workflows and future receipt download endpoints.
 */
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

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
	buildReceiptBuffer(receipt: DisbursementReceiptInput): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			const document = new PDFDocument({ size: 'A4', margin: 50 });

			document.on('data', (chunk: Buffer | string) => {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			});
			document.on('end', () => resolve(Buffer.concat(chunks)));
			document.on('error', reject);

			document.fontSize(20).text('KauntyBursary Disbursement Receipt');
			document.moveDown(1.2);
			document.fontSize(11);
			document.text(`Receipt ID: ${receipt.disbursementId}`);
			document.text(`Recipient: ${receipt.recipientName}`);
			document.text(`Amount (KES): ${receipt.amountKes.toFixed(2)}`);
			document.text(`Method: ${receipt.method}`);
			document.text(`Transaction ID: ${receipt.transactionId ?? 'N/A'}`);
			document.text(
				`Confirmed At: ${receipt.confirmedAt ? receipt.confirmedAt.toISOString() : 'Pending'}`,
			);
			document.moveDown();
			document
				.fontSize(9)
				.fillColor('#4B5563')
				.text('This receipt is system-generated and intended for bursary audit records.');

			document.end();
		});
	}
}
