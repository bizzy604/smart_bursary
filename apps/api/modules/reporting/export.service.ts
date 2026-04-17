/**
 * Purpose: Convert reporting datasets into downloadable CSV and PDF buffers.
 * Why important: Enables Excel/PDF exports required by county and ward reporting workflows.
 * Used by: ReportingController export endpoints and reporting analytics flows.
 */
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
	toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): Buffer {
		const allRows = [headers, ...rows];
		const csv = allRows
			.map((row) => row.map((value) => this.escapeCsv(value === null || value === undefined ? '' : String(value))).join(','))
			.join('\n');

		return Buffer.from(csv, 'utf8');
	}

	toPdf(options: {
		title: string;
		subtitle?: string;
		headers: string[];
		rows: Array<Array<string | number | null | undefined>>;
	}): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			const document = new PDFDocument({ size: 'A4', margin: 40 });

			document.on('data', (chunk: Buffer | string) => {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			});
			document.on('end', () => resolve(Buffer.concat(chunks)));
			document.on('error', reject);

			document.fontSize(18).text(options.title);
			if (options.subtitle) {
				document.moveDown(0.3);
				document.fontSize(10).fillColor('#4B5563').text(options.subtitle).fillColor('#000000');
			}

			document.moveDown(0.8);
			document.fontSize(10).text(options.headers.join(' | '));
			document.moveDown(0.4);

			for (const row of options.rows) {
				const printable = row.map((value) => (value === null || value === undefined ? '' : String(value)));
				document.text(printable.join(' | '));
			}

			document.end();
		});
	}

	private escapeCsv(value: string): string {
		if (/[",\n]/.test(value)) {
			return `"${value.replaceAll('"', '""')}"`;
		}

		return value;
	}
}
