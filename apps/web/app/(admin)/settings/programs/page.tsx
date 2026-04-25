"use client";

import Link from "next/link";
import type { Route } from "next";
import { type Table as TanStackTable } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DataTable,
  type DataTableSelectedActionsProps,
} from "@/components/shared/data-table";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  closeAdminProgram,
  fetchAdminPrograms,
  type ProgramListItem,
  ProgramStatus,
  publishAdminProgram,
} from "@/lib/admin-programs";
import { formatCurrencyKes } from "@/lib/format";
import { buildProgramListColumns } from "./columns";

type ProgramActionType = "publish" | "close";

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export default function ProgramSettingsListPage() {
  const [programs, setPrograms] = useState<
    Awaited<ReturnType<typeof fetchAdminPrograms>>
  >([]);
  const [status, setStatus] = useState<"ALL" | ProgramStatus>("ALL");
  const [academicYear, setAcademicYear] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const tableRef = useRef<TanStackTable<ProgramListItem> | null>(null);
  const [mutatingProgramIds, setMutatingProgramIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: ProgramActionType;
    programs: ProgramListItem[];
  } | null>(null);
  const isMutating = mutatingProgramIds.length > 0;
  const mutatingProgramIdSet = useMemo(
    () => new Set(mutatingProgramIds),
    [mutatingProgramIds],
  );

  const fetchPrograms = useCallback(async () => {
    return fetchAdminPrograms({
      status: status === "ALL" ? undefined : status,
      academicYear:
        academicYear.trim().length > 0 ? academicYear.trim() : undefined,
    });
  }, [academicYear, status]);

  const refreshPrograms = useCallback(async () => {
    const rows = await fetchPrograms();
    setPrograms(rows);
    return rows;
  }, [fetchPrograms]);

  useEffect(() => {
    let mounted = true;

    const loadPagePrograms = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchPrograms();
        if (mounted) {
          setPrograms(rows);
          setFeedback(null);
        }
      } catch (error: unknown) {
        if (mounted) {
          setFeedback({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to load programs.",
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPagePrograms();
    return () => {
      mounted = false;
    };
  }, [fetchPrograms]);

  const summary = useMemo(() => {
    return programs.reduce(
      (totals, program) => {
        totals.ceiling += program.budgetCeiling;
        totals.allocated += program.allocatedTotal;
        totals.disbursed += program.disbursedTotal;
        return totals;
      },
      { ceiling: 0, allocated: 0, disbursed: 0 },
    );
  }, [programs]);

  const openProgramAction = useCallback(
    (type: ProgramActionType, selectedPrograms: ProgramListItem[]) => {
      if (isMutating || selectedPrograms.length === 0) {
        return;
      }

      setPendingAction({ type, programs: selectedPrograms });
    },
    [isMutating],
  );

  const runProgramAction = useCallback(
    async (type: ProgramActionType, selectedPrograms: ProgramListItem[]) => {
      const programIds = selectedPrograms.map((program) => program.id);
      setMutatingProgramIds(programIds);
      setFeedback(null);

      try {
        const results = await Promise.allSettled(
          selectedPrograms.map((program) =>
            type === "publish"
              ? publishAdminProgram(program.id)
              : closeAdminProgram(program.id),
          ),
        );

        await refreshPrograms();
        tableRef.current?.resetRowSelection();

        const succeeded = results.filter(
          (result) => result.status === "fulfilled",
        ).length;
        const failed = results.length - succeeded;

        if (failed === 0) {
          const successMessage =
            succeeded === 1
              ? type === "publish"
                ? "Program published successfully."
                : "Program closed successfully."
              : `${succeeded} programs ${type === "publish" ? "published" : "closed"} successfully.`;

          setFeedback({ type: "success", message: successMessage });
          toast.success(
            succeeded === 1
              ? type === "publish"
                ? "Program published"
                : "Program closed"
              : type === "publish"
                ? "Programs published"
                : "Programs closed",
            {
              description:
                succeeded === 1
                  ? type === "publish"
                    ? "The bursary program is now available to students."
                    : "New submissions are now blocked for this program."
                  : type === "publish"
                    ? `${succeeded} bursary programs are now available to students.`
                    : `New submissions are now blocked for ${succeeded} programs.`,
            },
          );
        } else {
          const failureMessage =
            succeeded === 0
              ? type === "publish"
                ? `Failed to publish ${selectedPrograms.length === 1 ? "program" : `${selectedPrograms.length} selected programs`}.`
                : `Failed to close ${selectedPrograms.length === 1 ? "program" : `${selectedPrograms.length} selected programs`}.`
              : `${succeeded} ${pluralize(succeeded, "program")} ${type === "publish" ? "published" : "closed"}; ${failed} ${pluralize(failed, "request", "requests")} failed.`;

          setFeedback({ type: "error", message: failureMessage });
          toast.error(
            type === "publish"
              ? "Publish completed with errors"
              : "Close completed with errors",
            { description: failureMessage },
          );
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : type === "publish"
              ? "Failed to publish program."
              : "Failed to close program.";

        setFeedback({ type: "error", message });
        toast.error(
          type === "publish" ? "Publish failed" : "Close failed",
          { description: message },
        );
      } finally {
        setPendingAction(null);
        setMutatingProgramIds([]);
      }
    },
    [refreshPrograms],
  );

  const columns = useMemo(() => {
    return buildProgramListColumns({
      mutatingProgramIds: mutatingProgramIdSet,
      onRequestPublish: (program) => {
        openProgramAction("publish", [program]);
      },
      onRequestClose: (program) => {
        openProgramAction("close", [program]);
      },
    });
  }, [mutatingProgramIdSet, openProgramAction]);

  const renderSelectedActions = useCallback(
    ({ selectedRows }: DataTableSelectedActionsProps<ProgramListItem>) => {
      const selectedPrograms = selectedRows.map((row) => row.original);
      const draftPrograms = selectedPrograms.filter(
        (program) => program.status === "DRAFT",
      );
      const activePrograms = selectedPrograms.filter(
        (program) => program.status === "ACTIVE",
      );

      return (
        <>
          {draftPrograms.length > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={isMutating}
              onClick={() => openProgramAction("publish", draftPrograms)}
            >
              Publish selected ({draftPrograms.length})
            </Button>
          ) : null}
          {activePrograms.length > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={isMutating}
              onClick={() => openProgramAction("close", activePrograms)}
            >
              Close selected ({activePrograms.length})
            </Button>
          ) : null}
        </>
      );
    },
    [isMutating, openProgramAction],
  );

  const pendingPrograms = pendingAction?.programs ?? [];
  const pendingProgramCount = pendingPrograms.length;
  const pendingProgramName = pendingPrograms[0]?.name;
  const dialogTitle = pendingAction
    ? pendingAction.type === "publish"
      ? pendingProgramCount === 1
        ? "Publish program?"
        : `Publish ${pendingProgramCount} programs?`
      : pendingProgramCount === 1
        ? "Close program?"
        : `Close ${pendingProgramCount} programs?`
    : "";
  const dialogDescription = pendingAction
    ? pendingAction.type === "publish"
      ? pendingProgramCount === 1
        ? `This will make ${pendingProgramName} visible to students for applications.`
        : `This will make ${pendingProgramCount} selected draft programs visible to students for applications.`
      : pendingProgramCount === 1
        ? `This will stop new submissions for ${pendingProgramName}. Existing records will remain accessible.`
        : `This will stop new submissions for ${pendingProgramCount} selected active programs. Existing records will remain accessible.`
    : "";

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Program Management</CardTitle>
              <CardDescription>
                Create, edit, publish, and close county bursary programs.
              </CardDescription>
            </div>
            <Link href={"/county/programs/new" as Route}>
              <Button size="sm">New Program</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-700">
              Budget Ceiling
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-900">
              {formatCurrencyKes(summary.ceiling)}
            </p>
          </article>
          <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-700">
              Allocated
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-900">
              {formatCurrencyKes(summary.allocated)}
            </p>
          </article>
          <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-700">
              Disbursed
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-900">
              {formatCurrencyKes(summary.disbursed)}
            </p>
          </article>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Program List</CardTitle>
          <CardDescription>
            Filter by status and intake year to review lifecycle progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback ? (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                feedback.type === "success"
                  ? "border border-success-200 bg-success-50 text-success-700"
                  : "border border-danger-200 bg-danger-50 text-danger-700"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[180px_180px_auto]">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "ALL" | ProgramStatus)
                }
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-gray-700">Academic Year</span>
              <input
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                placeholder="2026"
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              />
            </label>
          </div>

          <DataTable
            columns={columns}
            data={programs}
            isLoading={isLoading}
            error={
              programs.length === 0 && feedback?.type === "error"
                ? feedback.message
                : null
            }
            enableRowSelection
            getRowId={(row) => row.id}
            onTableReady={(table) => {
              tableRef.current = table;
            }}
            renderSelectedActions={renderSelectedActions}
            searchColumnId="name"
            searchPlaceholder="Search program"
            initialSorting={[{ id: "closesAt", desc: false }]}
            initialPageSize={10}
            emptyState="No programs matched the selected filters."
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !isMutating) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              className={
                pendingAction?.type === "close"
                  ? "bg-danger-500 hover:bg-danger-700"
                  : undefined
              }
              onClick={() => {
                if (!pendingAction) {
                  return;
                }

                void runProgramAction(
                  pendingAction.type,
                  pendingAction.programs,
                );
              }}
            >
              {pendingAction?.type === "publish"
                ? isMutating
                  ? "Publishing..."
                  : "Confirm Publish"
                : isMutating
                  ? "Closing..."
                  : "Confirm Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
