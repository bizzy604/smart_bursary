import { describe, expect, it } from "vitest";

import {
	buildOcobCsv,
	buildWardReportCsv,
	ocobRows,
	ocobTotals,
	wardReportRows,
	wardReportTotals,
} from "@/lib/reporting-data";

describe("reporting data utilities", () => {
	it("computes ward totals from source rows", () => {
		const expected = wardReportRows.reduce(
			(acc, row) => ({
				applications: acc.applications + row.applications,
				approved: acc.approved + row.approved,
				rejected: acc.rejected + row.rejected,
				allocatedKes: acc.allocatedKes + row.allocatedKes,
				disbursedKes: acc.disbursedKes + row.disbursedKes,
			}),
			{ applications: 0, approved: 0, rejected: 0, allocatedKes: 0, disbursedKes: 0 },
		);

		expect(wardReportTotals()).toEqual(expected);
	});

	it("computes ocob totals including balance", () => {
		const expected = ocobRows.reduce(
			(acc, row) => ({
				applications: acc.applications + row.applications,
				approved: acc.approved + row.approved,
				allocatedKes: acc.allocatedKes + row.allocatedKes,
				disbursedKes: acc.disbursedKes + row.disbursedKes,
				balanceKes: acc.balanceKes + row.balanceKes,
			}),
			{ applications: 0, approved: 0, allocatedKes: 0, disbursedKes: 0, balanceKes: 0 },
		);

		expect(ocobTotals()).toEqual(expected);
	});

	it("builds ward report csv with expected row count", () => {
		const csv = buildWardReportCsv();
		const lines = csv.split("\n");

		expect(lines[0]).toBe("Ward,Applications,Approved,Rejected,Allocated KES,Disbursed KES");
		expect(lines).toHaveLength(wardReportRows.length + 1);
	});

	it("builds ocob csv with expected row count", () => {
		const csv = buildOcobCsv();
		const lines = csv.split("\n");

		expect(lines[0]).toBe("Ward,Applications,Approved,Allocated KES,Disbursed KES,Balance KES");
		expect(lines).toHaveLength(ocobRows.length + 1);
	});
});
