"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { DataTable } from "@/components/shared/data-table";
import {
  buildReviewQueueColumns,
  reviewQueueStatusOptions,
} from "@/components/shared/review-queue-columns";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes } from "@/lib/format";
import { fetchWardSummaryReport } from "@/lib/reporting-api";
import { fetchWorkflowQueueByStatus } from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

const wardQueueColumns = buildReviewQueueColumns({
  columns: [
    "reference",
    "applicantName",
    "programName",
    "educationLevel",
    "aiScore",
    "status",
    "reviewedAt",
  ],
  primaryAction: {
    label: "Review",
    href: (item) => `/ward/applications/${item.applicationId}` as Route,
  },
  menuActions: [
    {
      label: "View Documents",
      href: (item) => `/ward/applications/${item.applicationId}/documents` as Route,
    },
    {
      label: "AI Score",
      href: (item) => `/ward/applications/${item.applicationId}/score` as Route,
    },
  ],
});

export default function WardDashboardPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [allRows, setAllRows] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [wardQueue, report] = await Promise.all([
          fetchWorkflowQueueByStatus("WARD_REVIEW"),
          fetchWardSummaryReport({}),
        ]);

        if (!mounted) {
          return;
        }

        setQueue(wardQueue);
        setAllRows(report.rows.map((row) => ({
          applicationId: row.applicationId,
          reference: row.reference,
          applicantName: row.applicantName,
          wardName: row.wardName,
          programName: row.programName,
          academicYear: row.academicYear,
          educationLevel: row.educationLevel,
          status: row.status as ReviewQueueItem["status"],
          aiScore: row.aiScore,
          wardRecommendationKes: row.wardRecommendationKes,
          countyAllocationKes: row.countyAllocationKes,
          reviewerName: row.reviewerName,
          reviewerStage: row.reviewerStage,
          reviewedAt: row.reviewedAt,
        })));
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load ward dashboard.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const reviewedToday = allRows.filter((row) => {
      if (!row.reviewedAt) {
        return false;
      }
      return new Date(row.reviewedAt).toDateString() === today;
    }).length;

    return {
      pending: queue.length,
      reviewedToday,
      rejected: allRows.filter((row) => row.status === "REJECTED").length,
      recommendedKes: allRows.reduce((sum, row) => sum + row.wardRecommendationKes, 0),
    };
  }, [allRows, queue]);

  const educationLevelOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.educationLevel))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Ward Dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">Application Review Command Center</h1>
        <p className="mt-2 text-sm text-gray-600">
          Applications are ranked by AI score to help committee members prioritize high-need cases quickly.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Pending Review" value={String(stats.pending)} hint="Waiting in ward queue" />
        <StatsCard label="Reviewed Today" value={String(stats.reviewedToday)} hint="Committee decisions logged" />
        <StatsCard label="Rejected" value={String(stats.rejected)} hint="This cycle so far" />
        <StatsCard
          label="Recommended Amount"
          value={formatCurrencyKes(stats.recommendedKes)}
          hint="Total proposed to county"
        />
      </section>

      {error ? (
        <section className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          {error}
        </section>
      ) : null}

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-brand-900">Top Priority Applications</h2>
            <p className="text-sm text-gray-600">Sorted by AI score from highest need to lowest.</p>
          </div>
          <Link href="/ward/applications">
            <Button variant="outline" size="sm">Open Full Queue</Button>
          </Link>
        </div>

        <div className="mt-3">
          <DataTable
            columns={wardQueueColumns}
            data={queue}
            isLoading={isLoading}
            getRowId={(row) => row.applicationId}
            searchColumnId="applicantName"
            searchPlaceholder="Search applicant"
            facetedFilters={[
              ...(educationLevelOptions.length > 0
                ? [{ columnId: "educationLevel", title: "Level", options: educationLevelOptions }]
                : []),
              { columnId: "status", title: "Status", options: reviewQueueStatusOptions },
            ]}
            initialSorting={[{ id: "aiScore", desc: true }]}
            initialPageSize={10}
            emptyState="No applications are currently waiting in the ward queue."
          />
        </div>
      </section>
    </main>
  );
}
