"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { BudgetBar } from "@/components/application/budget-bar";
import { DataTable } from "@/components/shared/data-table";
import {
  buildReviewQueueColumns,
  reviewQueueStatusOptions,
} from "@/components/shared/review-queue-columns";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes } from "@/lib/format";
import { fetchDashboardReport, type DashboardReportData } from "@/lib/reporting-api";
import { fetchWorkflowQueueByStatus } from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

const countyQueueColumns = buildReviewQueueColumns({
  columns: [
    "reference",
    "applicantName",
    "wardName",
    "programName",
    "aiScore",
    "wardRecommendationKes",
    "status",
    "reviewedAt",
  ],
  primaryAction: {
    label: "Final Review",
    href: (item) => `/county/review/${item.applicationId}` as Route,
  },
  menuActions: [
    {
      label: "View application",
      href: (item) => `/county/applications/${item.applicationId}` as Route,
    },
  ],
});

export default function CountyDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardReportData | null>(null);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const [dashboard, countyQueue] = await Promise.all([
          fetchDashboardReport(),
          fetchWorkflowQueueByStatus("COUNTY_REVIEW"),
        ]);

        if (!mounted) {
          return;
        }

        setDashboardData(dashboard);
        setQueue(countyQueue);
        setDashboardError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to refresh dashboard metrics.";
        setDashboardError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();
    const intervalId = window.setInterval(() => {
      void loadDashboard();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const stats = useMemo(
    () => ({
      approved: dashboardData?.approvedApplications ?? 0,
      allocatedKes: dashboardData?.programs.reduce((sum, program) => sum + program.allocated_total, 0) ?? 0,
      remainingKes:
        dashboardData?.programs.reduce(
          (sum, program) => sum + (program.budget_ceiling - program.allocated_total),
          0,
        ) ?? 0,
      disbursed: dashboardData?.disbursedCount ?? 0,
    }),
    [dashboardData],
  );

  const budget = useMemo(() => {
    const primaryProgram = dashboardData?.programs[0];
    if (!primaryProgram) {
      return {
        programName: "County Bursary Programme",
        ceilingKes: 0,
        allocatedKes: 0,
        disbursedKes: 0,
      };
    }

    return {
      programName: primaryProgram.name,
      ceilingKes: primaryProgram.budget_ceiling,
      allocatedKes: primaryProgram.allocated_total,
      disbursedKes: primaryProgram.disbursed_total,
    };
  }, [dashboardData]);

  const wardFilterOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.wardName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">County Dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">Finance Officer Review Portal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor county allocations, track review throughput, and push approved records to disbursement.
        </p>
      </section>

      {dashboardError ? (
        <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{dashboardError}</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Approved" value={String(stats.approved)} hint="Approved applications this cycle" />
        <StatsCard label="Allocated" value={formatCurrencyKes(stats.allocatedKes)} hint="Total allocated amount" />
        <StatsCard label="Remaining" value={formatCurrencyKes(stats.remainingKes)} hint="Budget still available" />
        <StatsCard label="Disbursed" value={String(stats.disbursed)} hint={isLoading ? "Refreshing..." : "Applications already paid"} />
      </section>

      <BudgetBar
        programName={budget.programName}
        ceiling={budget.ceilingKes}
        allocated={budget.allocatedKes}
        disbursed={budget.disbursedKes}
      />

      {dashboardData?.ward_breakdown?.length ? (
        <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
          <h2 className="font-display text-xl font-semibold text-brand-900">Ward Breakdown</h2>
          <p className="text-sm text-gray-600">Auto-refreshes every 30 seconds.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2">Ward</th>
                  <th className="px-2 py-2">Applications</th>
                  <th className="px-2 py-2">Approved</th>
                  <th className="px-2 py-2">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.ward_breakdown.map((row) => (
                  <tr key={row.ward_id} className="border-b border-gray-100">
                    <td className="px-2 py-2 font-medium text-brand-900">{row.ward_name}</td>
                    <td className="px-2 py-2 text-gray-700">{row.applications}</td>
                    <td className="px-2 py-2 text-gray-700">{row.approved}</td>
                    <td className="px-2 py-2 text-gray-700">{formatCurrencyKes(row.allocated_kes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-brand-900">County Review Queue</h2>
            <p className="text-sm text-gray-600">Applications recommended by ward committees and awaiting final decision.</p>
          </div>
          <Link href="/county/review">
            <Button variant="outline" size="sm">Open Full Queue</Button>
          </Link>
        </div>

        <div className="mt-3">
          <DataTable
            columns={countyQueueColumns}
            data={queue}
            isLoading={isLoading}
            getRowId={(row) => row.applicationId}
            searchColumnId="applicantName"
            searchPlaceholder="Search applicant"
            facetedFilters={[
              ...(wardFilterOptions.length > 0
                ? [{ columnId: "wardName", title: "Ward", options: wardFilterOptions }]
                : []),
              { columnId: "status", title: "Status", options: reviewQueueStatusOptions },
            ]}
            initialSorting={[{ id: "aiScore", desc: true }]}
            initialPageSize={10}
            emptyState="No applications are currently waiting at county review stage."
          />
        </div>
      </section>
    </main>
  );
}
