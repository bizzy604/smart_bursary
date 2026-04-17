"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
  downloadWardSummaryExport,
  fetchDashboardReport,
  fetchWardSummaryReport,
  type DashboardReportData,
  type WardSummaryRow,
} from "@/lib/reporting-api";

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
  const [dashboard, setDashboard] = useState<DashboardReportData | null>(null);
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
      const [dashboardData, wardReport] = await Promise.all([
        fetchDashboardReport(),
        fetchWardSummaryReport({
          programId: scope.programId || undefined,
          wardId: scope.wardId || undefined,
          academicYear: scope.academicYear || undefined,
          educationLevel: scope.educationLevel || undefined,
        }),
      ]);
      setDashboard(dashboardData);
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
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Ward Report Export</h1>
        <p className="mt-1 text-sm text-gray-600">
          Export ward-level reports including AI review, allocation decisions, and reviewer attribution.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="grid gap-3 md:grid-cols-5">
          <select
            aria-label="Select report program"
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
            {(dashboard?.ward_breakdown ?? []).map((ward) => (
              <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>
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

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Applicant</th>
                <th className="px-2 py-2">Ward</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">AI Score</th>
                <th className="px-2 py-2">Recommended</th>
                <th className="px-2 py-2">Allocated</th>
                <th className="px-2 py-2">Reviewer Stage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.applicationId} className="border-b border-gray-100">
                  <td className="px-2 py-2 font-medium text-brand-900">{row.reference}</td>
                  <td className="px-2 py-2 text-gray-700">{row.applicantName}</td>
                  <td className="px-2 py-2 text-gray-700">{row.wardName}</td>
                  <td className="px-2 py-2 text-gray-700">{row.status}</td>
                  <td className="px-2 py-2 text-gray-700">{row.aiScore.toFixed(1)}</td>
                  <td className="px-2 py-2 text-gray-700">{formatCurrencyKes(row.wardRecommendationKes)}</td>
                  <td className="px-2 py-2 text-gray-700">{formatCurrencyKes(row.countyAllocationKes)}</td>
                  <td className="px-2 py-2 text-gray-700">{row.reviewerStage}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 text-gray-900">
                <td className="px-2 py-2 font-semibold">Total</td>
                <td className="px-2 py-2 font-semibold">-</td>
                <td className="px-2 py-2 font-semibold">-</td>
                <td className="px-2 py-2 font-semibold">-</td>
                <td className="px-2 py-2 font-semibold">-</td>
                <td className="px-2 py-2 font-semibold">{formatCurrencyKes(totals.recommendedKes)}</td>
                <td className="px-2 py-2 font-semibold">{formatCurrencyKes(totals.allocatedKes)}</td>
                <td className="px-2 py-2 font-semibold">{totals.approved} approved / {totals.rejected} rejected</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void exportReport("csv")} disabled={exporting !== null || isLoading}>
            {exporting === "csv" ? "Exporting CSV..." : "Download Excel (CSV)"}
          </Button>
          <Button variant="outline" onClick={() => void exportReport("pdf")} disabled={exporting !== null || isLoading}>
            {exporting === "pdf" ? "Exporting PDF..." : "Download PDF Summary"}
          </Button>
        </div>
      </section>
    </main>
  );
}
