"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/shared/data-table";
import { DataTableCsvExportButton } from "@/components/shared/data-table-csv-export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type SpreadsheetColumn } from "@/lib/csv-export";
import { formatShortDate } from "@/lib/format";
import { fetchDashboardReport, fetchTrendReport, type DashboardReportData, type TrendRow } from "@/lib/reporting-api";
import { countyTrendColumns } from "./columns";

const COUNTY_TREND_CSV_COLUMNS: SpreadsheetColumn<TrendRow>[] = [
  { header: "Academic Year", value: (row) => row.academicYear, width: 16 },
  { header: "Total Applications", value: (row) => row.totalApplications, type: "number", width: 18 },
  { header: "Approved Applications", value: (row) => row.approvedApplications, type: "number", width: 20 },
  { header: "Disbursed Applications", value: (row) => row.disbursedApplications, type: "number", width: 22 },
  { header: "Allocated (KES)", value: (row) => row.allocatedKes, type: "currency", width: 18 },
  { header: "Disbursed (KES)", value: (row) => row.disbursedKes, type: "currency", width: 18 },
];

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
      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <h1 className="font-serif text-2xl font-semibold text-primary">County Reports Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate OCOB-ready exports and ward performance summaries for finance and audit workflows.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Finance Compliance</p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-primary">OCOB Report</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Structured county-wide allocation and disbursement summary formatted for OCOB submissions.
          </p>
          <div className="mt-4">
            <Link href="/county/reports/ocob">
              <Button size="sm">Open OCOB Report</Button>
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Ward Operations</p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-primary">Ward Summary Exports</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Application, approval, rejection, and disbursement breakdown by ward for committee meetings.
          </p>
          <div className="mt-4">
            <Link href="/ward/reports">
              <Button variant="outline" size="sm">Open Ward Reports</Button>
            </Link>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-primary">Historical Trend Analysis</h2>
            <p className="text-sm text-muted-foreground">Filter by year, program, ward, and education level.</p>
          </div>
          <p className="text-xs text-muted-foreground">Refreshed {formatShortDate(generatedAt)}</p>
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <select
            aria-label="Filter by program"
            className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
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
            className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
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
            className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
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

        <div className="mt-4">
          <DataTable
            columns={countyTrendColumns}
            data={trends}
            isLoading={isLoading}
            error={trends.length === 0 ? error : null}
            getRowId={(row) => row.academicYear}
            searchColumnId="academicYear"
            searchPlaceholder="Search year"
            initialSorting={[{ id: "academicYear", desc: true }]}
            initialPageSize={10}
            emptyState="No historical trends match the current filters."
            renderSelectedActions={({ selectedRows }) => (
              <DataTableCsvExportButton
                selectedRows={selectedRows}
                columns={COUNTY_TREND_CSV_COLUMNS}
                filenamePrefix="county-trends"
                itemNoun="year"
              />
            )}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <h3 className="font-serif text-lg font-semibold text-primary">Latest Generated Report Snapshot</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Program</dt>
            <dd className="font-medium text-foreground">{dashboard?.programs[0]?.name ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Academic Year</dt>
            <dd className="font-medium text-foreground">{trends[0]?.academicYear ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Generated</dt>
            <dd className="font-medium text-foreground">{formatShortDate(generatedAt)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
