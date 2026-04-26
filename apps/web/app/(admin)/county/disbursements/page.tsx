"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BudgetBar } from "@/components/application/budget-bar";
import { DataTable } from "@/components/shared/data-table";
import { buildReviewQueueColumns } from "@/components/shared/review-queue-columns";
import {
  BulkActionBar,
  type BulkActionDefinition,
} from "@/components/shared/bulk-action-bar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [confirmDisburseAll, setConfirmDisburseAll] = useState(false);
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
    const results = await Promise.allSettled(
      queue.map((application) => initiateDisbursement(application.applicationId)),
    );

    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - succeeded;

    if (failed === 0) {
      toast.success("Disbursement initiated", {
        description: `${succeeded} disbursement request${succeeded === 1 ? "" : "s"} sent successfully.`,
      });
    } else if (succeeded === 0) {
      toast.error("Disbursement failed", {
        description: `All ${failed} request${failed === 1 ? "" : "s"} failed. Try again or check service health.`,
      });
    } else {
      toast.warning("Disbursement partially completed", {
        description: `${succeeded} succeeded, ${failed} failed.`,
      });
    }
    setIsDisbursing(false);
    setConfirmDisburseAll(false);
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
          if (failed > 0) {
            throw new Error(
              `${succeeded} succeeded, ${failed} failed. Refresh to see updated status.`,
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
        },
      },
    ],
    [],
  );

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <h1 className="font-serif text-2xl font-semibold text-primary">Disbursement Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground/90">
            Ready for payout: <span className="font-semibold">{queue.length} applications</span> •
            Total <span className="font-semibold">{formatCurrencyKes(selectedTotal)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isLoading || isDisbursing || queue.length === 0}
              onClick={() => setConfirmDisburseAll(true)}
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

      <AlertDialog
        open={confirmDisburseAll}
        onOpenChange={(open) => !isDisbursing && setConfirmDisburseAll(open)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Disburse all approved applications</AlertDialogTitle>
            <AlertDialogDescription>
              This will trigger M-Pesa B2C disbursement for {queue.length} application
              {queue.length === 1 ? "" : "s"} totalling {formatCurrencyKes(selectedTotal)}. This action
              cannot be undone — funds will be sent to applicant phone numbers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisbursing}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={isDisbursing}
                onClick={(event) => {
                  event.preventDefault();
                  void handleBulkDisburse();
                }}
              >
                {isDisbursing ? "Submitting..." : "Disburse all"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
