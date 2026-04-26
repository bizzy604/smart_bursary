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
  archiveAdminProgram,
  closeAdminProgram,
  deleteAdminProgram,
  fetchAdminPrograms,
  type ProgramListItem,
  ProgramStatus,
  publishAdminProgram,
  unarchiveAdminProgram,
} from "@/lib/admin-programs";
import { formatCurrencyKes } from "@/lib/format";
import { buildProgramListColumns, type ProgramRowAction } from "./columns";

type ProgramActionType = ProgramRowAction;

const PRESENT_TENSE: Record<ProgramActionType, string> = {
  publish: "Publishing",
  close: "Closing",
  archive: "Archiving",
  unarchive: "Restoring",
  delete: "Deleting",
};

const PAST_TENSE_SINGLE_TITLE: Record<ProgramActionType, string> = {
  publish: "Program published",
  close: "Program closed",
  archive: "Program archived",
  unarchive: "Program restored",
  delete: "Program deleted",
};

const PAST_TENSE_MULTI_TITLE: Record<ProgramActionType, string> = {
  publish: "Programs published",
  close: "Programs closed",
  archive: "Programs archived",
  unarchive: "Programs restored",
  delete: "Programs deleted",
};

function formatActionVerb(type: ProgramActionType): string {
  switch (type) {
    case "publish":
      return "published";
    case "close":
      return "closed";
    case "archive":
      return "archived";
    case "unarchive":
      return "restored";
    case "delete":
      return "deleted";
  }
}

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

      const runOne = (programId: string) => {
        switch (type) {
          case "publish":
            return publishAdminProgram(programId);
          case "close":
            return closeAdminProgram(programId);
          case "archive":
            return archiveAdminProgram(programId);
          case "unarchive":
            return unarchiveAdminProgram(programId);
          case "delete":
            return deleteAdminProgram(programId);
        }
      };

      try {
        const results = await Promise.allSettled(
          selectedPrograms.map((program) => runOne(program.id)),
        );

        await refreshPrograms();
        tableRef.current?.resetRowSelection();

        const succeeded = results.filter(
          (result) => result.status === "fulfilled",
        ).length;
        const failed = results.length - succeeded;
        const verb = formatActionVerb(type);
        const firstName = selectedPrograms[0]?.name ?? "the program";

        const successDescription =
          succeeded === 1
            ? type === "publish"
              ? "The bursary program is now available to students."
              : type === "close"
                ? "New submissions are now blocked for this program."
                : type === "archive"
                  ? `${firstName} has been archived and is no longer listed for students.`
                  : type === "unarchive"
                    ? `${firstName} has been restored to draft.`
                    : `${firstName} has been removed from the registry.`
            : type === "publish"
              ? `${succeeded} bursary programs are now available to students.`
              : type === "close"
                ? `New submissions are now blocked for ${succeeded} programs.`
                : type === "archive"
                  ? `${succeeded} programs have been archived.`
                  : type === "unarchive"
                    ? `${succeeded} programs have been restored.`
                    : `${succeeded} programs have been removed from the registry.`;

        if (failed === 0) {
          const successMessage =
            succeeded === 1
              ? `Program ${verb} successfully.`
              : `${succeeded} programs ${verb} successfully.`;

          setFeedback({ type: "success", message: successMessage });
          toast.success(
            succeeded === 1
              ? PAST_TENSE_SINGLE_TITLE[type]
              : PAST_TENSE_MULTI_TITLE[type],
            { description: successDescription },
          );
        } else {
          const failureMessage =
            succeeded === 0
              ? `Failed to ${type} ${selectedPrograms.length === 1 ? "program" : `${selectedPrograms.length} selected programs`}.`
              : `${succeeded} ${pluralize(succeeded, "program")} ${verb}; ${failed} ${pluralize(failed, "request", "requests")} failed.`;

          setFeedback({ type: "error", message: failureMessage });
          toast.error(`${PRESENT_TENSE[type]} completed with errors`, {
            description: failureMessage,
          });
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : `Failed to ${type} program.`;

        setFeedback({ type: "error", message });
        toast.error(`${PRESENT_TENSE[type]} failed`, { description: message });
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
      onRequestAction: (action, program) => {
        openProgramAction(action, [program]);
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
      const archivablePrograms = selectedPrograms.filter(
        (program) => program.status !== "ARCHIVED",
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
          {archivablePrograms.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isMutating}
              onClick={() =>
                openProgramAction("archive", archivablePrograms)
              }
            >
              Archive selected ({archivablePrograms.length})
            </Button>
          ) : null}
          <Button
            variant="destructive"
            size="sm"
            disabled={isMutating}
            onClick={() => openProgramAction("delete", selectedPrograms)}
          >
            Delete selected ({selectedPrograms.length})
          </Button>
        </>
      );
    },
    [isMutating, openProgramAction],
  );

  const pendingPrograms = pendingAction?.programs ?? [];
  const pendingProgramCount = pendingPrograms.length;
  const pendingProgramName = pendingPrograms[0]?.name ?? "this program";
  const dialogTitle = (() => {
    if (!pendingAction) return "";
    const isMulti = pendingProgramCount > 1;
    switch (pendingAction.type) {
      case "publish":
        return isMulti
          ? `Publish ${pendingProgramCount} programs?`
          : "Publish program?";
      case "close":
        return isMulti
          ? `Close ${pendingProgramCount} programs?`
          : "Close program?";
      case "archive":
        return isMulti
          ? `Archive ${pendingProgramCount} programs?`
          : "Archive program?";
      case "unarchive":
        return isMulti
          ? `Restore ${pendingProgramCount} programs from archive?`
          : "Restore program from archive?";
      case "delete":
        return isMulti
          ? `Delete ${pendingProgramCount} programs?`
          : "Delete program?";
    }
  })();
  const dialogDescription = (() => {
    if (!pendingAction) return "";
    const isMulti = pendingProgramCount > 1;
    switch (pendingAction.type) {
      case "publish":
        return isMulti
          ? `This will make ${pendingProgramCount} selected draft programs visible to students for applications.`
          : `This will make ${pendingProgramName} visible to students for applications.`;
      case "close":
        return isMulti
          ? `This will stop new submissions for ${pendingProgramCount} selected active programs. Existing records will remain accessible.`
          : `This will stop new submissions for ${pendingProgramName}. Existing records will remain accessible.`;
      case "archive":
        return isMulti
          ? `${pendingProgramCount} selected programs will be archived and hidden from default listings. You can restore them later from the Archived filter.`
          : `${pendingProgramName} will be archived and hidden from default listings. You can restore it later from the Archived filter.`;
      case "unarchive":
        return isMulti
          ? `${pendingProgramCount} archived programs will be restored to DRAFT. You can re-publish them after review.`
          : `${pendingProgramName} will be restored to DRAFT. You can re-publish it after review.`;
      case "delete":
        return isMulti
          ? `${pendingProgramCount} selected programs will be removed from the registry. This cannot be undone from the UI.`
          : `${pendingProgramName} will be removed from the registry. This cannot be undone from the UI.`;
    }
  })();
  const confirmButtonLabel = (() => {
    if (!pendingAction) return "Confirm";
    if (isMutating) return `${PRESENT_TENSE[pendingAction.type]}...`;
    switch (pendingAction.type) {
      case "publish":
        return "Confirm Publish";
      case "close":
        return "Confirm Close";
      case "archive":
        return "Archive program";
      case "unarchive":
        return "Restore program";
      case "delete":
        return "Delete program";
    }
  })();
  const isDestructive =
    pendingAction?.type === "close" ||
    pendingAction?.type === "archive" ||
    pendingAction?.type === "delete";

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
                <option value="ARCHIVED">Archived</option>
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
                isDestructive
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
              {confirmButtonLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
