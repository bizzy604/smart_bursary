"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  closeAdminProgram,
  fetchAdminPrograms,
  ProgramListItem,
  ProgramStatus,
  publishAdminProgram,
} from "@/lib/admin-programs";
import { formatCurrencyKes } from "@/lib/format";

const statusBadgeClass: Record<ProgramStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border border-gray-200",
  ACTIVE: "bg-success-50 text-success-700 border border-success-200",
  CLOSED: "bg-warning-50 text-warning-700 border border-warning-200",
  SUSPENDED: "bg-danger-50 text-danger-700 border border-danger-200",
};

export default function ProgramSettingsListPage() {
  const [programs, setPrograms] = useState<ProgramListItem[]>([]);
  const [status, setStatus] = useState<"ALL" | ProgramStatus>("ALL");
  const [academicYear, setAcademicYear] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
    const proceed = window.confirm("Publish this draft program? This will make it available to students.");
    if (!proceed) {
      return;
    }

    setIsMutating(programId);
    setFeedback(null);
    try {
      await publishAdminProgram(programId);
      await refreshPrograms();
      setFeedback({ type: "success", message: "Program published successfully." });
    } catch (error: unknown) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Failed to publish program." });
    } finally {
      setIsMutating(null);
    }
  }

  async function closeProgram(programId: string) {
    const proceed = window.confirm("Close this active program? New submissions will be blocked.");
    if (!proceed) {
      return;
    }

    setIsMutating(programId);
    setFeedback(null);
    try {
      await closeAdminProgram(programId);
      await refreshPrograms();
      setFeedback({ type: "success", message: "Program closed successfully." });
    } catch (error: unknown) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Failed to close program." });
    } finally {
      setIsMutating(null);
    }
  }

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Program Management</CardTitle>
              <CardDescription>Create, edit, publish, and close county bursary programs.</CardDescription>
            </div>
            <Link href="/settings/programs/new">
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

          {isLoading ? (
            <p className="text-sm text-gray-600">Loading programs...</p>
          ) : programs.length === 0 ? (
            <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
              No programs matched the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-2 py-2">Program</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Window</th>
                    <th className="px-2 py-2">Budget</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr key={program.id} className="border-b border-gray-100 align-top">
                      <td className="px-2 py-2">
                        <p className="font-medium text-brand-900">{program.name}</p>
                        <p className="mt-1 text-xs text-gray-600">Year: {program.academicYear ?? "-"}</p>
                        <p className="text-xs text-gray-600">Ward: {program.wardId ?? "County-wide"}</p>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[program.status]}`}>
                          {program.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700">
                        <p>Opens: {new Date(program.opensAt).toLocaleString()}</p>
                        <p className="mt-1">Closes: {new Date(program.closesAt).toLocaleString()}</p>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-700">
                        <p>Ceiling: {formatCurrencyKes(program.budgetCeiling)}</p>
                        <p className="mt-1">Allocated: {formatCurrencyKes(program.allocatedTotal)}</p>
                        <p className="mt-1">Disbursed: {formatCurrencyKes(program.disbursedTotal)}</p>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/settings/programs/${program.id}`}>
                            <Button variant="outline" size="sm">Open</Button>
                          </Link>
                          {program.status === "DRAFT" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void publishProgram(program.id)}
                              disabled={isMutating === program.id}
                            >
                              {isMutating === program.id ? "Publishing..." : "Publish"}
                            </Button>
                          ) : null}
                          {program.status === "ACTIVE" ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => void closeProgram(program.id)}
                              disabled={isMutating === program.id}
                            >
                              {isMutating === program.id ? "Closing..." : "Close"}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
