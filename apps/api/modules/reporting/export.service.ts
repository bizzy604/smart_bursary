/**
 * Purpose: Convert reporting rows into CSV buffers for downstream export endpoints.
 * Why important: Keeps export formatting reusable across dashboards and OCOB downloads.
 * Used by: ReportingService and future file export endpoints.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
	toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): Buffer {
		const allRows = [headers, ...rows];
		const csv = allRows
			.map((row) => row.map((value) => this.escapeCsv(value === null || value === undefined ? '' : String(value))).join(','))
			.join('\n');

		return Buffer.from(csv, 'utf8');
	}

	private escapeCsv(value: string): string {
		if (/[",\n]/.test(value)) {
			return `"${value.replaceAll('"', '""')}"`;
		}

		return value;
	}
}
