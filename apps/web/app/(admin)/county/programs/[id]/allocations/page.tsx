"use client";

/**
 * County admin Ward Allocation screen (Commit 5a of the data-integrity rollout).
 * This is the UI for §7 Stage 2 — pushing portions of a program's budget to wards.
 * Subsequent UI commits add the ward-committee village-split (5b) and
 * village-admin per-student allocation (5c) screens.
 */

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/api-client";
import {
  createWardAllocation,
  fetchWardAllocations,
  WardAllocationListResult,
  WardAllocationRow,
} from "@/lib/admin-allocations";
import { fetchAdminProgramById, ProgramDetail } from "@/lib/admin-programs";
import { formatCurrencyKes } from "@/lib/format";

function resolveProgramId(params: ReturnType<typeof useParams>): string {
  const id = params.id;
  if (Array.isArray(id)) return id[0] ?? "";
  return typeof id === "string" ? id : "";
}

function describeError(error: unknown): string {
  if (error instanceof ApiClientError) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}

export default function ProgramWardAllocationsPage() {
  const params = useParams();
  const programId = resolveProgramId(params);

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [allocationData, setAllocationData] = useState<WardAllocationListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ─── Add-allocation form state ───
  const [wardId, setWardId] = useState("");
  const [allocatedKes, setAllocatedKes] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingCapacity = allocationData?.programRemainingCapacity ?? 0;

  const isFormValid = useMemo(() => {
    if (!wardId.trim()) return false;
    const parsed = Number(allocatedKes);
    if (!Number.isFinite(parsed) || parsed <= 0) return false;
    return true;
  }, [wardId, allocatedKes]);

  useEffect(() => {
    if (!programId) return;
    let mounted = true;
    const load = async () => {
      try {
        const [programDetail, allocations] = await Promise.all([
          fetchAdminProgramById(programId),
          fetchWardAllocations(programId),
        ]);
        if (!mounted) return;
        setProgram(programDetail);
        setAllocationData(allocations);
      } catch (error) {
        if (mounted) setFeedback({ type: "error", message: describeError(error) });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [programId]);

  async function reloadAllocations() {
    const refreshed = await fetchWardAllocations(programId);
    setAllocationData(refreshed);
  }

  async function submitNewAllocation(event: React.FormEvent) {
    event.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await createWardAllocation(programId, {
        wardId: wardId.trim(),
        allocatedKes: Number(allocatedKes),
        note: note.trim() || undefined,
      });
      setFeedback({
        type: "success",
        message: `Ward pool of ${formatCurrencyKes(Number(result.allocation.allocatedKes))} saved. ` +
          `Program remaining capacity: ${formatCurrencyKes(result.programRemainingCapacity)}.`,
      });
      toast.success("Ward allocation saved", {
        description: `${formatCurrencyKes(Number(result.allocation.allocatedKes))} pushed to this ward.`,
      });
      setWardId("");
      setAllocatedKes("");
      setNote("");
      await reloadAllocations();
    } catch (error) {
      const message = describeError(error);
      setFeedback({ type: "error", message });
      toast.error("Allocation rejected", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Ward Budget Distribution</CardTitle>
              <CardDescription>
                Push portions of this program&apos;s budget to specific wards. Each ward&apos;s pool is
                later split across its villages by the ward committee, and village admins set the
                final per-student amount. Sum across all wards must stay ≤ the program&apos;s
                budget ceiling (Invariant 1).
              </CardDescription>
            </div>
            <Link href={`/county/programs/${programId}` as Route}>
              <Button variant="outline" size="sm">Back to Program</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
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

          {isLoading || !program || !allocationData ? (
            <p className="text-sm text-gray-600">Loading program and ward allocations…</p>
          ) : (
            <>
              <ProgramHeaderTotals program={program} allocationData={allocationData} />

              <NewAllocationForm
                wardId={wardId}
                onWardIdChange={setWardId}
                allocatedKes={allocatedKes}
                onAllocatedKesChange={setAllocatedKes}
                note={note}
                onNoteChange={setNote}
                onSubmit={submitNewAllocation}
                isSubmitting={isSubmitting}
                isFormValid={isFormValid}
                remainingCapacity={remainingCapacity}
              />

              <ExistingAllocations allocations={allocationData.allocations} programId={programId} />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ProgramHeaderTotals({
  program,
  allocationData,
}: {
  program: ProgramDetail;
  allocationData: WardAllocationListResult;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-brand-700">Program Ceiling</p>
        <p className="mt-1 font-display text-xl font-semibold text-brand-900">
          {formatCurrencyKes(allocationData.programBudgetCeiling)}
        </p>
        <p className="mt-1 text-xs text-gray-600">{program.name}</p>
      </article>
      <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-brand-700">Distributed to Wards</p>
        <p className="mt-1 font-display text-xl font-semibold text-brand-900">
          {formatCurrencyKes(allocationData.totalAllocatedToWards)}
        </p>
        <p className="mt-1 text-xs text-gray-600">{allocationData.allocations.length} ward(s)</p>
      </article>
      <article
        className={`rounded-lg border p-3 ${
          allocationData.programRemainingCapacity <= 0
            ? "border-warning-200 bg-warning-50"
            : "border-success-200 bg-success-50"
        }`}
      >
        <p
          className={`text-xs uppercase tracking-[0.12em] ${
            allocationData.programRemainingCapacity <= 0 ? "text-warning-700" : "text-success-700"
          }`}
        >
          Remaining Capacity
        </p>
        <p
          className={`mt-1 font-display text-xl font-semibold ${
            allocationData.programRemainingCapacity <= 0 ? "text-warning-700" : "text-success-700"
          }`}
        >
          {formatCurrencyKes(allocationData.programRemainingCapacity)}
        </p>
      </article>
    </div>
  );
}

function NewAllocationForm({
  wardId,
  onWardIdChange,
  allocatedKes,
  onAllocatedKesChange,
  note,
  onNoteChange,
  onSubmit,
  isSubmitting,
  isFormValid,
  remainingCapacity,
}: {
  wardId: string;
  onWardIdChange: (value: string) => void;
  allocatedKes: string;
  onAllocatedKesChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  isSubmitting: boolean;
  isFormValid: boolean;
  remainingCapacity: number;
}) {
  const wouldExceed =
    allocatedKes !== "" &&
    Number.isFinite(Number(allocatedKes)) &&
    Number(allocatedKes) > remainingCapacity;

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
      <header>
        <h3 className="font-display text-base font-semibold text-brand-900">
          Add ward allocation
        </h3>
        <p className="text-xs text-gray-600">
          Submitting an allocation that already exists for this (program, ward) updates the existing
          row in place. Sum across wards is enforced ≤ program ceiling at write time.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-gray-700">Ward ID (UUID)</span>
          <Input
            value={wardId}
            onChange={(event) => onWardIdChange(event.target.value)}
            placeholder="6f8c2d9c-1234-4abc-9def-0123456789ab"
            disabled={isSubmitting}
          />
          <span className="text-xs text-gray-500">
            Paste the ward UUID from the wards directory. A picker will replace this in 5b.
          </span>
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-gray-700">Allocated amount (KES)</span>
          <Input
            type="number"
            min={1}
            step={0.01}
            value={allocatedKes}
            onChange={(event) => onAllocatedKesChange(event.target.value)}
            placeholder="e.g. 5000000"
            disabled={isSubmitting}
          />
          {wouldExceed ? (
            <span className="text-xs text-danger-700">
              Exceeds remaining program capacity ({formatCurrencyKes(remainingCapacity)}).
            </span>
          ) : null}
        </label>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-gray-700">Note (optional)</span>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={2}
            disabled={isSubmitting}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-50"
            placeholder="Recorded in the immutable audit timeline."
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isFormValid || wouldExceed}>
          {isSubmitting ? "Saving…" : "Save ward allocation"}
        </Button>
      </div>
    </form>
  );
}

function ExistingAllocations({
  allocations,
  programId,
}: {
  allocations: WardAllocationRow[];
  programId: string;
}) {
  if (allocations.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
        No ward allocations yet. Add one above to start the §7 ward → village → student flow.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="font-display text-base font-semibold text-brand-900">
        Ward allocations ({allocations.length})
      </h3>
      <div className="overflow-hidden rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.08em] text-gray-600">
            <tr>
              <th className="px-3 py-2">Ward</th>
              <th className="px-3 py-2">Allocated</th>
              <th className="px-3 py-2">Distributed to villages</th>
              <th className="px-3 py-2">Disbursed</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {allocations.map((row) => {
              const remainingForVillages = row.allocatedKes - row.allocatedTotalKes;
              return (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    <div>{row.wardName}</div>
                    {row.wardCode ? (
                      <div className="text-xs text-gray-500">{row.wardCode}</div>
                    ) : null}
                    <div className="font-mono text-[10px] text-gray-400">{row.wardId.slice(0, 8)}…</div>
                  </td>
                  <td className="px-3 py-2">{formatCurrencyKes(row.allocatedKes)}</td>
                  <td className="px-3 py-2">
                    <div>{formatCurrencyKes(row.allocatedTotalKes)}</div>
                    <div
                      className={`text-xs ${
                        remainingForVillages <= 0 ? "text-success-700" : "text-warning-700"
                      }`}
                    >
                      {remainingForVillages <= 0
                        ? "Fully distributed"
                        : `${formatCurrencyKes(remainingForVillages)} remaining`}
                    </div>
                  </td>
                  <td className="px-3 py-2">{formatCurrencyKes(row.disbursedTotalKes)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/county/programs/${programId}/allocations/${row.id}` as Route}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      Distribute →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        &quot;Distribute →&quot; opens the ward-committee village split screen (Commit 5b, coming next).
      </p>
    </section>
  );
}
