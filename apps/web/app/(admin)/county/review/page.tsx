"use client";

import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import {
  buildReviewQueueColumns,
  reviewQueueStatusOptions,
} from "@/components/shared/review-queue-columns";
import { fetchWorkflowQueueByStatus } from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

const countyReviewColumns = buildReviewQueueColumns({
  columns: [
    "reference",
    "applicantName",
    "wardName",
    "programName",
    "educationLevel",
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

export default function CountyReviewQueuePage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadQueue = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchWorkflowQueueByStatus("COUNTY_REVIEW");
        if (!mounted) {
          return;
        }

        setQueue(rows);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load county review queue.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadQueue();

    return () => {
      mounted = false;
    };
  }, []);

  const wardFilterOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.wardName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const programOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.programName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">County Review Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Final approval stage for ward-recommended applications before disbursement.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <DataTable
          columns={countyReviewColumns}
          data={queue}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.applicationId}
          searchColumnId="applicantName"
          searchPlaceholder="Search by reference or applicant"
          facetedFilters={[
            ...(wardFilterOptions.length > 0
              ? [{ columnId: "wardName", title: "Ward", options: wardFilterOptions }]
              : []),
            ...(programOptions.length > 0
              ? [{ columnId: "programName", title: "Program", options: programOptions }]
              : []),
            { columnId: "status", title: "Status", options: reviewQueueStatusOptions },
          ]}
          initialSorting={[{ id: "aiScore", desc: true }]}
          initialPageSize={10}
          emptyState="There are no ward-recommended applications waiting for county decisions right now."
        />
      </section>
    </main>
  );
}
