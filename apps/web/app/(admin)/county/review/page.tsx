"use client";

import type { Route } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { buildReviewQueueColumns } from "@/components/shared/review-queue-columns";
import {
  BulkActionBar,
  type BulkActionDefinition,
} from "@/components/shared/bulk-action-bar";
import {
  fetchWorkflowQueueByStatus,
  submitCountyReview,
} from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

export default function CountyReviewQueuePage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const wardFilterOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.wardName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const programOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.programName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const educationLevelOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.educationLevel))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const countyReviewColumns = useMemo(
    () =>
      buildReviewQueueColumns({
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
            href: (item) =>
              `/county/applications/${item.applicationId}` as Route,
          },
        ],
        wardOptions: wardFilterOptions,
        programOptions,
        educationLevelOptions,
      }),
    [wardFilterOptions, programOptions, educationLevelOptions],
  );

  const bulkActions = useMemo<BulkActionDefinition<ReviewQueueItem>[]>(
    () => [
      {
        id: "county-approve",
        label: "Approve & queue disbursement",
        confirmTitle: "Approve selected applications",
        confirmDescription: (rows) =>
          `Approve ${rows.length} application${rows.length === 1 ? "" : "s"} at the ward-recommended amount and move them toward disbursement.`,
        confirmLabel: "Approve",
        fields: [
          {
            id: "note",
            label: "Approval note",
            type: "textarea",
            placeholder: "Optional context for the audit log",
          },
        ],
        onRun: async (selected, values) => {
          const note = values.note ?? "";
          for (const row of selected) {
            const allocated = row.original.wardRecommendationKes ?? 0;
            await submitCountyReview(
              row.original.applicationId,
              "APPROVED",
              allocated,
              note,
            );
          }
        },
      },
      {
        id: "county-waitlist",
        label: "Waitlist",
        variant: "outline",
        confirmTitle: "Waitlist selected applications",
        confirmDescription: (rows) =>
          `Move ${rows.length} application${rows.length === 1 ? "" : "s"} to the waitlist for the next allocation cycle.`,
        confirmLabel: "Waitlist",
        fields: [
          {
            id: "note",
            label: "Reason",
            type: "textarea",
            placeholder: "Why are these being waitlisted?",
            required: true,
          },
        ],
        onRun: async (selected, values) => {
          const note = (values.note ?? "").trim();
          if (!note) throw new Error("Please provide a reason.");
          for (const row of selected) {
            await submitCountyReview(
              row.original.applicationId,
              "WAITLISTED",
              0,
              note,
            );
          }
        },
      },
      {
        id: "county-reject",
        label: "Reject",
        variant: "destructive",
        confirmTitle: "Reject selected applications",
        confirmDescription: (rows) =>
          `Reject ${rows.length} application${rows.length === 1 ? "" : "s"}. This decision is final.`,
        confirmLabel: "Reject",
        fields: [
          {
            id: "note",
            label: "Reason for rejection",
            type: "textarea",
            placeholder: "Explain the decision",
            required: true,
          },
        ],
        onRun: async (selected, values) => {
          const note = (values.note ?? "").trim();
          if (!note) throw new Error("Please provide a reason.");
          for (const row of selected) {
            await submitCountyReview(
              row.original.applicationId,
              "REJECTED",
              0,
              note,
            );
          }
        },
      },
    ],
    [],
  );

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">County Review Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Final approval stage for ward-recommended applications before disbursement.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <DataTable
          columns={countyReviewColumns}
          data={queue}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.applicationId}
          searchColumnId="applicantName"
          searchPlaceholder="Search applications…"
          initialSorting={[{ id: "aiScore", desc: true }]}
          initialPageSize={10}
          emptyState="There are no ward-recommended applications waiting for county decisions right now."
          enableRowSelection
          renderSelectedActions={({ table, selectedRows, selectedCount, clearSelection }) => (
            <BulkActionBar
              table={table}
              selectedRows={selectedRows}
              selectedCount={selectedCount}
              clearSelection={clearSelection}
              actions={bulkActions}
              onSuccess={refresh}
            />
          )}
        />
      </section>
    </main>
  );
}
