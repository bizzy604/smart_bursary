/**
 * Purpose: Build OCOB-style row collections for county reporting exports.
 * Why important: OCOB exports are a common financial oversight output and need a stable row contract.
 * Used by: Reporting workflows and future CSV/Excel export endpoints.
 */
import { Injectable } from '@nestjs/common';

export type OcobAwardRow = {
	programId: string;
	programName: string;
	academicYear: string;
	budgetCeilingKes: number;
	applications: number;
	approved: number;
	allocatedKes: number;
	disbursedKes: number;
	balanceKes: number;
};

@Injectable()
export class OcobReportService {
	buildRows(rows: OcobAwardRow[]): OcobAwardRow[] {
		return rows.map((row) => ({
			...row,
			budgetCeilingKes: Number(row.budgetCeilingKes),
			allocatedKes: Number(row.allocatedKes),
			disbursedKes: Number(row.disbursedKes),
			balanceKes: Number(row.balanceKes),
		}));
	}
}
