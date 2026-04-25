"use client";

import { useEffect, useMemo, useState } from "react";
import { reviewQueueStatusOptions } from "@/components/shared/review-queue-columns";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
  downloadWardSummaryExport,
  fetchWardSummaryReport,
  type WardSummaryRow,
} from "@/lib/reporting-api";
import { wardReportColumns } from "./columns";

type WardFilters = {
  programId: string;
  wardId: string;
  academicYear: string;
  educationLevel: string;
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

export default function WardReportsPage() {
  const [catalogRows, setCatalogRows] = useState<WardSummaryRow[]>([]);
  const [rows, setRows] = useState<WardSummaryRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [filters, setFilters] = useState<WardFilters>({
    programId: "",
    wardId: "",
    academicYear: "",
    educationLevel: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (scope: WardFilters = filters) => {
    try {
      setIsLoading(true);
      const shouldRefreshCatalog =
        catalogRows.length === 0
        && !scope.programId
        && !scope.wardId
        && !scope.academicYear
        && !scope.educationLevel;

      const [catalogReport, wardReport] = await Promise.all([
        shouldRefreshCatalog ? fetchWardSummaryReport({}) : Promise.resolve(null),
        fetchWardSummaryReport({
          programId: scope.programId || undefined,
          wardId: scope.wardId || undefined,
          academicYear: scope.academicYear || undefined,
          educationLevel: scope.educationLevel || undefined,
        }),
      ]);

      if (catalogReport) {
        setCatalogRows(catalogReport.rows);
      }
      setRows(wardReport.rows);
      setGeneratedAt(wardReport.generatedAt);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load ward summary report.");
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
          applications: summary.applications + 1,
          approved: summary.approved + (row.status === "APPROVED" || row.status === "DISBURSED" ? 1 : 0),
          rejected: summary.rejected + (row.status === "REJECTED" ? 1 : 0),
          recommendedKes: summary.recommendedKes + row.wardRecommendationKes,
          allocatedKes: summary.allocatedKes + row.countyAllocationKes,
          disbursedKes: summary.disbursedKes + (row.status === "DISBURSED" ? row.countyAllocationKes : 0),
        }),
        { applications: 0, approved: 0, rejected: 0, recommendedKes: 0, allocatedKes: 0, disbursedKes: 0 },
      ),
    [rows],
  );

  const filterSourceRows = catalogRows.length > 0 ? catalogRows : rows;

  const programOptions = useMemo(() => {
    const values = new Map<string, string>();
    for (const row of filterSourceRows) {
      if (!values.has(row.programId)) {
        values.set(row.programId, row.programName);
      }
    }

    return Array.from(values.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [filterSourceRows]);

  const academicYearOptions = useMemo(() => {
    const values = new Set<string>();
    for (const row of filterSourceRows) {
      values.add(row.academicYear);
    }
    return Array.from(values).sort();
  }, [filterSourceRows]);

  const wardOptions = useMemo(() => {
    const entries = new Map<string, string>();
    for (const row of filterSourceRows) {
      if (!entries.has(row.wardId)) {
        entries.set(row.wardId, row.wardName);
      }
    }

    return Array.from(entries.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [filterSourceRows]);

  const exportReport = async (format: "csv" | "pdf") => {
    try {
      setExporting(format);
      const blob = await downloadWardSummaryExport(
        {
          programId: filters.programId || undefined,
          wardId: filters.wardId || undefined,
          academicYear: filters.academicYear || undefined,
          educationLevel: filters.educationLevel || undefined,
        },
        format,
      );
      saveBlob(blob, format === "csv" ? "ward-summary-report.csv" : "ward-summary-report.pdf");
    } catch (exportError: unknown) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export ward summary report.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Ward Report Export</h1>
        <p className="mt-1 text-sm text-gray-600">
          Export ward-level reports including AI review, allocation decisions, and reviewer attribution.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="grid gap-3 md:grid-cols-5">
          <select
            aria-label="Select report program"
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            value={filters.programId}
            onChange={(event) => setFilters((current) => ({ ...current, programId: event.target.value }))}
          >
            <option value="">All Programs</option>
            {programOptions.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>

          <select
            aria-label="Select report academic year"
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
            aria-label="Select report ward scope"
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            value={filters.wardId}
            onChange={(event) => setFilters((current) => ({ ...current, wardId: event.target.value }))}
          >
            <option value="">All Wards</option>
            {wardOptions.map((ward) => (
              <option key={ward.id} value={ward.id}>{ward.name}</option>
            ))}
          </select>

          <select
            aria-label="Select report education level"
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            value={filters.educationLevel}
            onChange={(event) => setFilters((current) => ({ ...current, educationLevel: event.target.value }))}
          >
            <option value="">All Education Levels</option>
            <option value="UNIVERSITY">University</option>
            <option value="TVET">TVET</option>
            <option value="SECONDARY">Secondary</option>
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
          <span>{totals.rejected} rejected</span>
          <span>Recommended {formatCurrencyKes(totals.recommendedKes)}</span>
          <span>Allocated {formatCurrencyKes(totals.allocatedKes)}</span>
          <span>Disbursed {formatCurrencyKes(totals.disbursedKes)}</span>
        </div>

        <div className="mt-4">
          <DataTable
            columns={wardReportColumns}
            data={rows}
            isLoading={isLoading}
            error={rows.length === 0 ? error : null}
            getRowId={(row) => row.applicationId}
            searchColumnId="applicantName"
            searchPlaceholder="Search applicant"
            facetedFilters={[
              { columnId: "status", title: "Status", options: reviewQueueStatusOptions },
            ]}
            initialSorting={[{ id: "reviewedAt", desc: true }]}
            initialColumnVisibility={{ reviewerStage: false, academicYear: false }}
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
            emptyState="No ward report rows match the current scope."
          />
        </div>
      </section>
    </main>
  );
}
