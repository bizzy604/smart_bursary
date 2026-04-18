"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/application/status-badge";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { fetchWardSummaryReport } from "@/lib/reporting-api";
import { fetchWorkflowQueueByStatus } from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

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

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-600">Loading top-priority applications...</p>
        ) : queue.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No pending ward reviews"
              description="Applications will appear here once they reach ward committee stage."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {queue.map((application) => (
              <article key={application.applicationId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{application.reference} • {application.applicantName}</p>
                  <p className="mt-1 text-sm text-gray-600">
                      {application.wardName} Ward • {application.programName} • {application.educationLevel}
                  </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {application.reviewedAt
                        ? `Last updated ${formatShortDate(application.reviewedAt)}`
                        : "Awaiting committee decision"}
                    </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI Score</p>
                  <p className="font-display text-lg font-semibold text-brand-900">{application.aiScore.toFixed(1)} / 100</p>
                  <div className="mt-1">
                    <StatusBadge status={application.status} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/ward/applications/${application.applicationId}` as Route}>
                  <Button size="sm">Review</Button>
                </Link>
                <Link href={`/ward/applications/${application.applicationId}/documents` as Route}>
                  <Button variant="outline" size="sm">View Documents</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      </section>
    </main>
  );
}
