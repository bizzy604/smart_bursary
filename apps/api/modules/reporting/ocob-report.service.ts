/**
 * Purpose: Build OCOB-style row collections for county reporting exports.
 * Why important: OCOB exports are a common financial oversight output and need a stable row contract.
 * Used by: Reporting workflows and future CSV/Excel export endpoints.
 */
import { Injectable } from '@nestjs/common';

export type OcobAwardRow = {
	programId: string;
	programName: string;
	wardName?: string | null;
	awardedCount: number;
	totalAwarded: number;
};

@Injectable()
export class OcobReportService {
	buildRows(rows: OcobAwardRow[]): OcobAwardRow[] {
		return rows.map((row) => ({
			...row,
			totalAwarded: Number(row.totalAwarded),
		}));
	}
}
