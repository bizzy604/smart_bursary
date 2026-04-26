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
  submitWardReview,
} from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

export default function WardApplicationsPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const bulkActions = useMemo<BulkActionDefinition<ReviewQueueItem>[]>(
    () => [
      {
        id: "ward-recommend",
        label: "Recommend",
        confirmTitle: "Recommend selected applications",
        confirmDescription: (rows) =>
          `Mark ${rows.length} application${rows.length === 1 ? "" : "s"} as RECOMMENDED with the same amount.`,
        confirmLabel: "Recommend",
        fields: [
          {
            id: "amount",
            label: "Recommended amount",
            type: "number",
            placeholder: "e.g. 25000",
            required: true,
            min: 0,
            step: 500,
            suffix: "KES per application",
          },
          {
            id: "note",
            label: "Committee note",
            type: "textarea",
            placeholder: "Optional context recorded with each decision",
          },
        ],
        onRun: async (selected, values) => {
          const amount = Number(values.amount);
          if (Number.isNaN(amount) || amount <= 0) {
            throw new Error("Recommended amount must be a positive number.");
          }
          const note = values.note ?? "";
          for (const row of selected) {
            await submitWardReview(
              row.original.applicationId,
              "RECOMMENDED",
              amount,
              note,
            );
          }
        },
      },
      {
        id: "ward-return",
        label: "Return",
        variant: "outline",
        confirmTitle: "Return selected applications",
        confirmDescription: (rows) =>
          `Send ${rows.length} application${rows.length === 1 ? "" : "s"} back for additional information.`,
        confirmLabel: "Return",
        fields: [
          {
            id: "note",
            label: "Reason",
            type: "textarea",
            placeholder: "What information is missing?",
            required: true,
          },
        ],
        onRun: async (selected, values) => {
          const note = (values.note ?? "").trim();
          if (!note) throw new Error("Please provide a reason.");
          for (const row of selected) {
            await submitWardReview(
              row.original.applicationId,
              "RETURNED",
              0,
              note,
            );
          }
        },
      },
      {
        id: "ward-reject",
        label: "Reject",
        variant: "destructive",
        confirmTitle: "Reject selected applications",
        confirmDescription: (rows) =>
          `Reject ${rows.length} application${rows.length === 1 ? "" : "s"}. This decision is recorded and visible to applicants.`,
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
            await submitWardReview(
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

  const educationLevelOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.educationLevel))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const programOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.programName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const wardApplicationsColumns = useMemo(
    () =>
      buildReviewQueueColumns({
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
            href: (item) =>
              `/ward/applications/${item.applicationId}/documents` as Route,
          },
          {
            label: "AI Score",
            href: (item) =>
              `/ward/applications/${item.applicationId}/score` as Route,
          },
        ],
        programOptions,
        educationLevelOptions,
      }),
    [programOptions, educationLevelOptions],
  );

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <h1 className="font-serif text-2xl font-semibold text-primary">Ward Applications Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review, recommend, return, or reject applications at ward committee level.
        </p>
      </section>

      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <DataTable
          columns={wardApplicationsColumns}
          data={queue}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.applicationId}
          searchColumnId="applicantName"
          searchPlaceholder="Search applications…"
          initialSorting={[{ id: "aiScore", desc: true }]}
          initialPageSize={10}
          emptyState="There are no applications currently waiting for ward committee decisions."
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
