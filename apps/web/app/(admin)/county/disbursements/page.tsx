"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BudgetBar } from "@/components/application/budget-bar";
import { DataTable } from "@/components/shared/data-table";
import { buildReviewQueueColumns } from "@/components/shared/review-queue-columns";
import {
  BulkActionBar,
  type BulkActionDefinition,
} from "@/components/shared/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes } from "@/lib/format";
import { fetchDashboardReport } from "@/lib/reporting-api";
import {
  exportEftBatch,
  fetchWorkflowQueueByStatus,
  initiateDisbursement,
} from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

export default function CountyDisbursementsPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [budget, setBudget] = useState({
    programName: "County Bursary Programme",
    ceilingKes: 0,
    allocatedKes: 0,
    disbursedKes: 0,
  });

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const [approvedQueue, dashboard] = await Promise.all([
        fetchWorkflowQueueByStatus("APPROVED"),
        fetchDashboardReport(),
      ]);

      setQueue(approvedQueue);
      const primaryProgram = dashboard.programs[0];
      if (primaryProgram) {
        setBudget({
          programName: primaryProgram.name,
          ceilingKes: primaryProgram.budget_ceiling,
          allocatedKes: primaryProgram.allocated_total,
          disbursedKes: primaryProgram.disbursed_total,
        });
      }

      setError(null);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Failed to load disbursement queue.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const selectedTotal = useMemo(() => {
    return queue.reduce((sum, application) => sum + application.countyAllocationKes, 0);
  }, [queue]);

  const wardFilterOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.wardName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const programOptions = useMemo(() => {
    const values = Array.from(new Set(queue.map((item) => item.programName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const disbursementColumns = useMemo(
    () =>
      buildReviewQueueColumns({
        columns: [
          "reference",
          "applicantName",
          "wardName",
          "programName",
          "countyAllocationKes",
          "status",
          "reviewedAt",
        ],
        menuActions: [
          {
            label: "View application",
            href: (item) =>
              `/county/applications/${item.applicationId}` as Route,
          },
        ],
        wardOptions: wardFilterOptions,
        programOptions,
      }),
    [wardFilterOptions, programOptions],
  );

  const handleBulkDisburse = async () => {
    setIsDisbursing(true);
    setFeedback(null);
    const results = await Promise.allSettled(
      queue.map((application) => initiateDisbursement(application.applicationId)),
    );

    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - succeeded;

    setFeedback(`Disbursement requests sent. Success: ${succeeded}, failed: ${failed}.`);
    setIsDisbursing(false);
    await loadQueue();
  };

  const bulkActions = useMemo<BulkActionDefinition<ReviewQueueItem>[]>(
    () => [
      {
        id: "disburse-mpesa",
        label: "Disburse via M-Pesa",
        confirmTitle: "Disburse via M-Pesa B2C",
        confirmDescription: (rows) =>
          `Initiate M-Pesa B2C disbursement for ${rows.length} application${
            rows.length === 1 ? "" : "s"
          } totalling ${formatCurrencyKes(
            rows.reduce(
              (sum, row) => sum + (row.original.countyAllocationKes ?? 0),
              0,
            ),
          )}.`,
        confirmLabel: "Disburse",
        onRun: async (selected) => {
          const results = await Promise.allSettled(
            selected.map((row) =>
              initiateDisbursement(row.original.applicationId),
            ),
          );
          const succeeded = results.filter((r) => r.status === "fulfilled")
            .length;
          const failed = results.length - succeeded;
          setFeedback(
            `Disbursement requests sent. Success: ${succeeded}, failed: ${failed}.`,
          );
          if (failed > 0) {
            throw new Error(
              `${failed} disbursement request${failed === 1 ? "" : "s"} failed. Refresh to see updated status.`,
            );
          }
        },
      },
      {
        id: "export-eft",
        label: "Export EFT batch",
        variant: "outline",
        confirmTitle: "Export EFT batch",
        confirmDescription: (rows) =>
          `Generate an EFT batch CSV for ${rows.length} selected application${
            rows.length === 1 ? "" : "s"
          }. The file will download to your device.`,
        confirmLabel: "Export",
        onRun: async (selected) => {
          const blob = await exportEftBatch(
            selected.map((row) => row.original.applicationId),
          );
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `county-eft-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setFeedback(
            `EFT batch exported for ${selected.length} application${
              selected.length === 1 ? "" : "s"
            }.`,
          );
        },
      },
    ],
    [],
  );

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Disbursement Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Approved applications pending payout through M-Pesa B2C or EFT batch export.
        </p>
      </section>

      <BudgetBar
        programName={budget.programName}
        ceiling={budget.ceilingKes}
        allocated={budget.allocatedKes}
        disbursed={budget.disbursedKes}
      />

      {error ? (
        <section className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          {error}
        </section>
      ) : null}
      {feedback ? (
        <section className="rounded-xl border border-info-100 bg-info-50 p-4 text-sm text-info-700">
          {feedback}
        </section>
      ) : null}

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            Ready for payout: <span className="font-semibold">{queue.length} applications</span> •
            Total <span className="font-semibold">{formatCurrencyKes(selectedTotal)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isLoading || isDisbursing || queue.length === 0}
              onClick={() => void handleBulkDisburse()}
            >
              {isDisbursing ? "Submitting..." : "Disburse all"}
            </Button>
            <Link href="/county/disbursements/batch">
              <Button variant="outline" size="sm">Open EFT Batch Page</Button>
            </Link>
          </div>
        </div>

        <div className="mt-3">
          <DataTable
            columns={disbursementColumns}
            data={queue}
            isLoading={isLoading}
            getRowId={(row) => row.applicationId}
            searchColumnId="applicantName"
            searchPlaceholder="Search applications…"
            initialSorting={[{ id: "countyAllocationKes", desc: true }]}
            initialPageSize={10}
            emptyState="No approved applications are currently waiting for disbursement."
            enableRowSelection
            renderSelectedActions={({ table, selectedRows, selectedCount, clearSelection }) => (
              <BulkActionBar
                table={table}
                selectedRows={selectedRows}
                selectedCount={selectedCount}
                clearSelection={clearSelection}
                actions={bulkActions}
                onSuccess={loadQueue}
              />
            )}
          />
        </div>
      </section>
    </main>
  );
}
