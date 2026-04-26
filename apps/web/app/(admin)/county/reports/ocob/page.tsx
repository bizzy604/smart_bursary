"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { DataTableCsvExportButton } from "@/components/shared/data-table-csv-export-button";
import { Button } from "@/components/ui/button";
import { type SpreadsheetColumn } from "@/lib/csv-export";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
  downloadOcobExport,
  fetchDashboardReport,
  fetchOcobReport,
  type DashboardReportData,
  type OcobRow,
} from "@/lib/reporting-api";
import { ocobReportColumns } from "./columns";

const OCOB_CSV_COLUMNS: SpreadsheetColumn<OcobRow>[] = [
  { header: "Program", value: (row) => row.programName, width: 36 },
  { header: "Academic Year", value: (row) => row.academicYear, width: 16 },
  { header: "Budget Ceiling (KES)", value: (row) => row.budgetCeilingKes, type: "currency", width: 22 },
  { header: "Applications", value: (row) => row.applications, type: "number", width: 14 },
  { header: "Approved", value: (row) => row.approved, type: "number", width: 12 },
  { header: "Allocated (KES)", value: (row) => row.allocatedKes, type: "currency", width: 18 },
  { header: "Disbursed (KES)", value: (row) => row.disbursedKes, type: "currency", width: 18 },
  { header: "Balance (KES)", value: (row) => row.balanceKes, type: "currency", width: 16 },
];

type OcobFilters = {
  programId: string;
  wardId: string;
  academicYear: string;
};

function saveBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export default function CountyOcobReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardReportData | null>(null);
  const [rows, setRows] = useState<OcobRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [filters, setFilters] = useState<OcobFilters>({
    programId: "",
    wardId: "",
    academicYear: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (scope: OcobFilters = filters) => {
    try {
      setIsLoading(true);
      const [dashboardData, ocobReport] = await Promise.all([
        fetchDashboardReport(),
        fetchOcobReport({
          programId: scope.programId || undefined,
          wardId: scope.wardId || undefined,
          academicYear: scope.academicYear || undefined,
        }),
      ]);
      setDashboard(dashboardData);
      setRows(ocobReport.rows);
      setGeneratedAt(ocobReport.generatedAt);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load OCOB report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, row) => ({
          applications: summary.applications + row.applications,
          approved: summary.approved + row.approved,
          allocatedKes: summary.allocatedKes + row.allocatedKes,
          disbursedKes: summary.disbursedKes + row.disbursedKes,
          balanceKes: summary.balanceKes + row.balanceKes,
        }),
        { applications: 0, approved: 0, allocatedKes: 0, disbursedKes: 0, balanceKes: 0 },
      ),
    [rows],
  );

  const academicYearOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of rows) {
      values.add(row.academicYear);
    }
    return Array.from(values).sort();
  }, [rows]);

  const exportReport = async (format: "csv" | "pdf") => {
    try {
      setExporting(format);
      const blob = await downloadOcobExport(
        {
          programId: filters.programId || undefined,
          wardId: filters.wardId || undefined,
          academicYear: filters.academicYear || undefined,
        },
        format,
      );
      saveBlob(blob, format === "csv" ? "ocob-report.csv" : "ocob-report.pdf");
    } catch (exportError: unknown) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export OCOB report.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">OCOB Report Generation</h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate county-level allocations, disbursements, and balances in an OCOB-compatible structure.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            aria-label="Select OCOB program"
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            value={filters.programId}
            onChange={(event) => setFilters((current) => ({ ...current, programId: event.target.value }))}
          >
            <option value="">All Programs</option>
            {(dashboard?.programs ?? []).map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>

          <select
            aria-label="Select OCOB academic year"
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            value={filters.academicYear}
            onChange={(event) => setFilters((current) => ({ ...current, academicYear: event.target.value }))}
          >
            <option value="">All Academic Years</option>
            {academicYearOptions.map((academicYear) => (
              <option key={academicYear} value={academicYear}>{academicYear}</option>
            ))}
          </select>

          <select
            aria-label="Select OCOB ward scope"
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            value={filters.wardId}
            onChange={(event) => setFilters((current) => ({ ...current, wardId: event.target.value }))}
          >
            <option value="">All Wards</option>
            {(dashboard?.ward_breakdown ?? []).map((ward) => (
              <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Button size="sm" onClick={() => void loadReport(filters)}>{isLoading ? "Loading..." : "Apply"}</Button>
            <span>Generated {formatShortDate(generatedAt ?? new Date().toISOString())}</span>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
          <span className="font-medium text-brand-900">{totals.applications} applications</span>
          <span>{totals.approved} approved</span>
          <span>Allocated {formatCurrencyKes(totals.allocatedKes)}</span>
          <span>Disbursed {formatCurrencyKes(totals.disbursedKes)}</span>
          <span>Balance {formatCurrencyKes(totals.balanceKes)}</span>
        </div>

        <div className="mt-4">
          <DataTable
            columns={ocobReportColumns}
            data={rows}
            isLoading={isLoading}
            error={rows.length === 0 ? error : null}
            getRowId={(row) => `${row.programId}-${row.academicYear}`}
            searchColumnId="programName"
            searchPlaceholder="Search program"
            initialSorting={[{ id: "allocatedKes", desc: true }]}
            initialPageSize={10}
            toolbar={(
              <>
                <Button onClick={() => void exportReport("csv")} disabled={exporting !== null || isLoading}>
                  {exporting === "csv" ? "Exporting CSV..." : "Download Excel (CSV)"}
                </Button>
                <Button variant="outline" onClick={() => void exportReport("pdf")} disabled={exporting !== null || isLoading}>
                  {exporting === "pdf" ? "Exporting PDF..." : "Download PDF Summary"}
                </Button>
              </>
            )}
            emptyState="No OCOB report rows match the current scope."
            renderSelectedActions={({ selectedRows }) => (
              <DataTableCsvExportButton
                selectedRows={selectedRows}
                columns={OCOB_CSV_COLUMNS}
                filenamePrefix="ocob-report-selection"
                itemNoun="row"
              />
            )}
          />
        </div>
      </section>
    </main>
  );
}
