"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/format";
import { fetchDashboardReport, fetchTrendReport, type DashboardReportData, type TrendRow } from "@/lib/reporting-api";

export default function CountyReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardReportData | null>(null);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    programId: "",
    wardId: "",
    educationLevel: "",
    fromYear: String(new Date().getFullYear() - 1),
    toYear: String(new Date().getFullYear()),
  });

  const loadReports = async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      const parsedFromYear = Number.parseInt(nextFilters.fromYear, 10);
      const parsedToYear = Number.parseInt(nextFilters.toYear, 10);
      const [dashboardData, trendData] = await Promise.all([
        fetchDashboardReport(),
        fetchTrendReport({
          programId: nextFilters.programId || undefined,
          wardId: nextFilters.wardId || undefined,
          educationLevel: nextFilters.educationLevel || undefined,
          fromYear: Number.isNaN(parsedFromYear) ? undefined : parsedFromYear,
          toYear: Number.isNaN(parsedToYear) ? undefined : parsedToYear,
        }),
      ]);
      setDashboard(dashboardData);
      setTrends(trendData.trends);
      setError(null);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load reporting analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generatedAt = useMemo(() => dashboard?.as_of ?? new Date().toISOString(), [dashboard]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">County Reports Hub</h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate OCOB-ready exports and ward performance summaries for finance and audit workflows.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Finance Compliance</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-brand-900">OCOB Report</h2>
          <p className="mt-2 text-sm text-gray-600">
            Structured county-wide allocation and disbursement summary formatted for OCOB submissions.
          </p>
          <div className="mt-4">
            <Link href="/county/reports/ocob">
              <Button size="sm">Open OCOB Report</Button>
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Ward Operations</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-brand-900">Ward Summary Exports</h2>
          <p className="mt-2 text-sm text-gray-600">
            Application, approval, rejection, and disbursement breakdown by ward for committee meetings.
          </p>
          <div className="mt-4">
            <Link href="/ward/reports">
              <Button variant="outline" size="sm">Open Ward Reports</Button>
            </Link>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-brand-900">Historical Trend Analysis</h2>
            <p className="text-sm text-gray-600">Filter by year, program, ward, and education level.</p>
          </div>
          <p className="text-xs text-gray-500">Refreshed {formatShortDate(generatedAt)}</p>
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <select
            aria-label="Filter by program"
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
            aria-label="Filter by ward"
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
            aria-label="Filter by education level"
            className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700"
            value={filters.educationLevel}
            onChange={(event) => setFilters((current) => ({ ...current, educationLevel: event.target.value }))}
          >
            <option value="">All Education Levels</option>
            <option value="UNIVERSITY">University</option>
            <option value="TVET">TVET</option>
            <option value="SECONDARY">Secondary</option>
          </select>

          <Input
            aria-label="From year"
            type="number"
            value={filters.fromYear}
            onChange={(event) => setFilters((current) => ({ ...current, fromYear: event.target.value }))}
          />

          <Input
            aria-label="To year"
            type="number"
            value={filters.toYear}
            onChange={(event) => setFilters((current) => ({ ...current, toYear: event.target.value }))}
          />
        </div>

        <div className="mt-3">
          <Button
            size="sm"
            onClick={() => {
              void loadReports(filters);
            }}
          >
            {isLoading ? "Loading..." : "Apply Filters"}
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">Academic Year</th>
                <th className="px-2 py-2">Applications</th>
                <th className="px-2 py-2">Approved</th>
                <th className="px-2 py-2">Disbursed</th>
                <th className="px-2 py-2">Allocated</th>
                <th className="px-2 py-2">Disbursed Amount</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((row) => (
                <tr key={row.academicYear} className="border-b border-gray-100">
                  <td className="px-2 py-2 font-medium text-brand-900">{row.academicYear}</td>
                  <td className="px-2 py-2 text-gray-700">{row.totalApplications}</td>
                  <td className="px-2 py-2 text-gray-700">{row.approvedApplications}</td>
                  <td className="px-2 py-2 text-gray-700">{row.disbursedApplications}</td>
                  <td className="px-2 py-2 text-gray-700">KES {row.allocatedKes.toLocaleString()}</td>
                  <td className="px-2 py-2 text-gray-700">KES {row.disbursedKes.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h3 className="font-display text-lg font-semibold text-brand-900">Latest Generated Report Snapshot</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Program</dt>
            <dd className="font-medium text-gray-900">{dashboard?.programs[0]?.name ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Academic Year</dt>
            <dd className="font-medium text-gray-900">{trends[0]?.academicYear ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Generated</dt>
            <dd className="font-medium text-gray-900">{formatShortDate(generatedAt)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
