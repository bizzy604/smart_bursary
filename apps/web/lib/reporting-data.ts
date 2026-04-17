export interface WardReportRow {
  ward: string;
  applications: number;
  approved: number;
  rejected: number;
  allocatedKes: number;
  disbursedKes: number;
}

export interface OCOBReportRow {
  ward: string;
  applications: number;
  approved: number;
  allocatedKes: number;
  disbursedKes: number;
  balanceKes: number;
}

export interface ReportMeta {
  programName: string;
  academicYear: string;
  generatedAt: string;
}

export const reportMeta: ReportMeta = {
  programName: "2026 Ward Bursary Programme",
  academicYear: "2026",
  generatedAt: "2026-04-17T09:45:00Z",
};

export const wardReportRows: WardReportRow[] = [
  {
    ward: "Kalokol",
    applications: 142,
    approved: 45,
    rejected: 24,
    allocatedKes: 1800000,
    disbursedKes: 1620000,
  },
  {
    ward: "Lokichar",
    applications: 98,
    approved: 31,
    rejected: 18,
    allocatedKes: 1240000,
    disbursedKes: 930000,
  },
  {
    ward: "Nadapal",
    applications: 83,
    approved: 27,
    rejected: 19,
    allocatedKes: 910000,
    disbursedKes: 760000,
  },
  {
    ward: "Kakuma",
    applications: 175,
    approved: 54,
    rejected: 39,
    allocatedKes: 1050000,
    disbursedKes: 890000,
  },
];

export const ocobRows: OCOBReportRow[] = wardReportRows.map((row) => ({
  ward: row.ward,
  applications: row.applications,
  approved: row.approved,
  allocatedKes: row.allocatedKes,
  disbursedKes: row.disbursedKes,
  balanceKes: row.allocatedKes - row.disbursedKes,
}));

export function wardReportTotals() {
  return wardReportRows.reduce(
    (totals, row) => {
      return {
        applications: totals.applications + row.applications,
        approved: totals.approved + row.approved,
        rejected: totals.rejected + row.rejected,
        allocatedKes: totals.allocatedKes + row.allocatedKes,
        disbursedKes: totals.disbursedKes + row.disbursedKes,
      };
    },
    {
      applications: 0,
      approved: 0,
      rejected: 0,
      allocatedKes: 0,
      disbursedKes: 0,
    },
  );
}

export function ocobTotals() {
  return ocobRows.reduce(
    (totals, row) => {
      return {
        applications: totals.applications + row.applications,
        approved: totals.approved + row.approved,
        allocatedKes: totals.allocatedKes + row.allocatedKes,
        disbursedKes: totals.disbursedKes + row.disbursedKes,
        balanceKes: totals.balanceKes + row.balanceKes,
      };
    },
    {
      applications: 0,
      approved: 0,
      allocatedKes: 0,
      disbursedKes: 0,
      balanceKes: 0,
    },
  );
}

function csvEscape(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}

export function buildWardReportCsv(): string {
  const header = ["Ward", "Applications", "Approved", "Rejected", "Allocated KES", "Disbursed KES"];
  const rows = wardReportRows.map((row) => [
    row.ward,
    row.applications,
    row.approved,
    row.rejected,
    row.allocatedKes,
    row.disbursedKes,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");
}

export function buildOcobCsv(): string {
  const header = ["Ward", "Applications", "Approved", "Allocated KES", "Disbursed KES", "Balance KES"];
  const rows = ocobRows.map((row) => [
    row.ward,
    row.applications,
    row.approved,
    row.allocatedKes,
    row.disbursedKes,
    row.balanceKes,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");
}
