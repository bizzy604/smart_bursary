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

const wardApplicationsColumns = buildReviewQueueColumns({
  columns: [
    "reference",
    "applicantName",
    "wardName",
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
      label: "Documents",
      href: (item) => `/ward/applications/${item.applicationId}/documents` as Route,
    },
    {
      label: "AI Score",
      href: (item) => `/ward/applications/${item.applicationId}/score` as Route,
    },
  ],
});

export default function WardApplicationsPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadQueue = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchWorkflowQueueByStatus("WARD_REVIEW");
        if (!mounted) {
          return;
        }

        setQueue(rows);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load ward review queue.";
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

  const educationLevelOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.educationLevel))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const programOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.programName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Ward Applications Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review, recommend, return, or reject applications at ward committee level.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <DataTable
          columns={wardApplicationsColumns}
          data={queue}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.applicationId}
          searchColumnId="applicantName"
          searchPlaceholder="Search by name, reference, or ward"
          facetedFilters={[
            ...(educationLevelOptions.length > 0
              ? [{ columnId: "educationLevel", title: "Level", options: educationLevelOptions }]
              : []),
            ...(programOptions.length > 0
              ? [{ columnId: "programName", title: "Program", options: programOptions }]
              : []),
            { columnId: "status", title: "Status", options: reviewQueueStatusOptions },
          ]}
          initialSorting={[{ id: "aiScore", desc: true }]}
          initialPageSize={10}
          emptyState="There are no applications currently waiting for ward committee decisions."
        />
      </section>
    </main>
  );
}
