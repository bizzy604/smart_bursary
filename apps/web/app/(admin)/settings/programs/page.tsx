"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/shared/data-table";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ProgramSettingsListPage() {
  const [programs, setPrograms] = useState<Awaited<ReturnType<typeof fetchAdminPrograms>>>([]);
  const [status, setStatus] = useState<"ALL" | ProgramStatus>("ALL");
  const [academicYear, setAcademicYear] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "publish" | "close";
    program: ProgramListItem;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPrograms = async () => {
      try {
        const rows = await fetchAdminPrograms({
          status: status === "ALL" ? undefined : status,
          academicYear: academicYear.trim().length > 0 ? academicYear.trim() : undefined,
        });
        if (mounted) {
          setPrograms(rows);
          setFeedback(null);
        }
      } catch (error: unknown) {
        if (mounted) {
          setFeedback({
            type: "error",
            message: error instanceof Error ? error.message : "Failed to load programs.",
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPrograms();
    return () => {
      mounted = false;
    };
  }, [status, academicYear]);

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

  async function refreshPrograms() {
    const rows = await fetchAdminPrograms({
      status: status === "ALL" ? undefined : status,
      academicYear: academicYear.trim().length > 0 ? academicYear.trim() : undefined,
    });
    setPrograms(rows);
  }

  async function publishProgram(programId: string) {
    setIsMutating(programId);
    setFeedback(null);
    try {
      await publishAdminProgram(programId);
      await refreshPrograms();
      setFeedback({ type: "success", message: "Program published successfully." });
      toast({
        title: "Program published",
        description: "The bursary program is now available to students.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to publish program.";
      setFeedback({ type: "error", message });
      toast({
        title: "Publish failed",
        description: message,
        variant: "error",
      });
    } finally {
      setPendingAction(null);
      setIsMutating(null);
    }
  }

  async function closeProgram(programId: string) {
    setIsMutating(programId);
    setFeedback(null);
    try {
      await closeAdminProgram(programId);
      await refreshPrograms();
      setFeedback({ type: "success", message: "Program closed successfully." });
      toast({
        title: "Program closed",
        description: "New submissions are now blocked for this program.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to close program.";
      setFeedback({ type: "error", message });
      toast({
        title: "Close failed",
        description: message,
        variant: "error",
      });
    } finally {
      setPendingAction(null);
      setIsMutating(null);
    }
  }

  const columns = useMemo(() => {
    return buildProgramListColumns({
      isMutating,
      onRequestPublish: (program) => {
        setPendingAction({ type: "publish", program });
      },
      onRequestClose: (program) => {
        setPendingAction({ type: "close", program });
      },
    });
  }, [isMutating]);

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Program Management</CardTitle>
              <CardDescription>Create, edit, publish, and close county bursary programs.</CardDescription>
            </div>
            <Link href={"/county/programs/new" as Route}>
              <Button size="sm">New Program</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-700">Budget Ceiling</p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-900">{formatCurrencyKes(summary.ceiling)}</p>
          </article>
          <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-700">Allocated</p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-900">{formatCurrencyKes(summary.allocated)}</p>
          </article>
          <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-700">Disbursed</p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-900">{formatCurrencyKes(summary.disbursed)}</p>
          </article>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Program List</CardTitle>
          <CardDescription>Filter by status and intake year to review lifecycle progress.</CardDescription>
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
                onChange={(event) => setStatus(event.target.value as "ALL" | ProgramStatus)}
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
            error={programs.length === 0 && feedback?.type === "error" ? feedback.message : null}
            getRowId={(row) => row.id}
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
            <AlertDialogTitle>
              {pendingAction?.type === "publish" ? "Publish program?" : "Close program?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "publish"
                ? `This will make ${pendingAction.program.name} visible to students for applications.`
                : `This will stop new submissions for ${pendingAction?.program.name}. Existing records will remain accessible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(isMutating)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingAction?.type === "close" ? "bg-danger-500 hover:bg-danger-700" : undefined}
              onClick={() => {
                if (!pendingAction) {
                  return;
                }

                if (pendingAction.type === "publish") {
                  void publishProgram(pendingAction.program.id);
                  return;
                }

                void closeProgram(pendingAction.program.id);
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
