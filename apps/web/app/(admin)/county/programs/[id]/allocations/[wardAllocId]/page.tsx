"use client";

/**
 * Ward-committee Village-split screen (Commit 5b of the data-integrity rollout).
 *
 * Route: /county/programs/[id]/allocations/[wardAllocId]
 *
 * Purpose: §7 Stage 3 — split a ward pool across the villages in the ward. The
 *          backend enforces Invariant 2 (Σ village_pool == ward_pool) under
 *          nested program → ward advisory locks. This page provides the
 *          ward-committee-facing UX for that decision: it primes the per-village
 *          table with the system's proportional suggestion (more applicants ⇒
 *          larger share), lets the committee adjust each row in-place, shows a
 *          live running total + remaining-to-distribute badge, and only enables
 *          submit when Σ == wardPool.
 *
 * After a successful distribute, the page surfaces:
 *   - the persisted per-village rows (with applicantCountAtDistribution captured)
 *   - the count of applications that were transitioned to
 *     VILLAGE_ALLOCATION_PENDING by the same Stage 3 transaction (Commit 3 wiring).
 *
 * 409 ceiling/invariant violations from the backend are surfaced inline with
 * the originating ApiClientError.code so reviewers can debug without DevTools.
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
  DistributionMethod,
  ProportionalSuggestion,
  VillageAllocationListResult,
  VillageProportionalEntry,
  WardAllocationRow,
  distributeWardToVillages,
  fetchProportionalSuggestion,
  fetchVillageAllocations,
  fetchWardAllocations,
} from "@/lib/admin-allocations";
import { fetchAdminProgramById, ProgramDetail } from "@/lib/admin-programs";
import { formatCurrencyKes } from "@/lib/format";

type RouteParams = ReturnType<typeof useParams>;

function readParam(params: RouteParams, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function describeError(error: unknown): string {
  if (error instanceof ApiClientError) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}

interface VillageRow {
  villageUnitId: string;
  villageName: string;
  villageCode: string | null;
  applicantCount: number;
  /** Form input value (string so users can type freely; coerced to number on submit). */
  draftKes: string;
}

function rowsFromSuggestion(suggestion: ProportionalSuggestion): VillageRow[] {
  return suggestion.suggestions.map((s) => ({
    villageUnitId: s.villageUnitId,
    villageName: s.villageName,
    villageCode: s.villageCode,
    applicantCount: s.applicantCount,
    draftKes: String(Math.round(s.suggestedAllocatedKes)),
  }));
}

function rowsFromExisting(
  existing: VillageAllocationListResult,
  suggestion: ProportionalSuggestion,
): VillageRow[] {
  // If a village_budget_allocation already exists, use its allocatedKes as the
  // starting point so the committee can see and adjust the previously-saved
  // distribution rather than overwriting it blindly with a fresh proportional
  // suggestion. We still merge in any villages from the suggestion that don't
  // yet have a saved row (so a newly-added village shows up).
  const byVillage = new Map(existing.villages.map((v) => [v.villageUnitId, v]));
  const merged: VillageRow[] = [];
  for (const s of suggestion.suggestions) {
    const persisted = byVillage.get(s.villageUnitId);
    merged.push({
      villageUnitId: s.villageUnitId,
      villageName: s.villageName,
      villageCode: s.villageCode,
      applicantCount: persisted?.applicantCountAtDistribution ?? s.applicantCount,
      draftKes: String(Math.round(persisted ? persisted.allocatedKes : s.suggestedAllocatedKes)),
    });
  }
  return merged;
}

export default function WardVillageDistributionPage() {
  const params = useParams();
  const programId = readParam(params, "id");
  const wardAllocId = readParam(params, "wardAllocId");

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [wardAllocation, setWardAllocation] = useState<WardAllocationRow | null>(null);
  const [suggestion, setSuggestion] = useState<ProportionalSuggestion | null>(null);
  const [existing, setExisting] = useState<VillageAllocationListResult | null>(null);

  const [rows, setRows] = useState<VillageRow[]>([]);
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>("PROPORTIONAL");
  const [dueAt, setDueAt] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const wardPoolKes = wardAllocation?.allocatedKes ?? suggestion?.wardPoolKes ?? 0;

  const sumDraft = useMemo(() => {
    return rows.reduce((acc, r) => {
      const n = Number(r.draftKes);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [rows]);

  const remaining = wardPoolKes - sumDraft;
  // We treat |remaining| < 0.01 as "balanced" because Decimal serialisation
  // can introduce sub-cent rounding noise. The backend's Decimal comparison
  // is exact at the cent level so we keep the same tolerance here.
  const isBalanced = Math.abs(remaining) < 0.01;

  const isFormValid = useMemo(() => {
    if (rows.length === 0) return false;
    if (!isBalanced) return false;
    for (const r of rows) {
      const n = Number(r.draftKes);
      if (!Number.isFinite(n) || n < 0) return false;
    }
    return true;
  }, [rows, isBalanced]);

  useEffect(() => {
    if (!programId || !wardAllocId) return;
    let mounted = true;

    const load = async () => {
      try {
        const [programDetail, wardList, prop, vill] = await Promise.all([
          fetchAdminProgramById(programId),
          fetchWardAllocations(programId),
          fetchProportionalSuggestion(wardAllocId),
          fetchVillageAllocations(wardAllocId).catch(() => null),
        ]);
        if (!mounted) return;
        const matchingWard = wardList.allocations.find((row) => row.id === wardAllocId) ?? null;
        setProgram(programDetail);
        setWardAllocation(matchingWard);
        setSuggestion(prop);
        setExisting(vill);
        setRows(vill ? rowsFromExisting(vill, prop) : rowsFromSuggestion(prop));
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
  }, [programId, wardAllocId]);

  function updateRow(villageUnitId: string, draftKes: string) {
    setRows((prev) =>
      prev.map((r) => (r.villageUnitId === villageUnitId ? { ...r, draftKes } : r)),
    );
  }

  function applyProportionalSuggestion() {
    if (!suggestion) return;
    setRows(rowsFromSuggestion(suggestion));
    setDistributionMethod("PROPORTIONAL");
    setFeedback({ type: "success", message: "Reset to system proportional suggestion." });
  }

  async function submitDistribution(event: React.FormEvent) {
    event.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await distributeWardToVillages(wardAllocId, {
        villageAllocations: rows.map((r) => ({
          villageUnitId: r.villageUnitId,
          allocatedKes: Number(r.draftKes),
          applicantCountAtDistribution: r.applicantCount,
        })),
        distributionMethod,
        villageAllocationDueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        note: note.trim() || undefined,
      });

      const transitioned = result.applicationsTransitioned;
      const successMsg =
        `Distributed ${formatCurrencyKes(result.totalDistributed)} across ${result.villages.length} villages.` +
        (transitioned > 0
          ? ` ${transitioned} application${transitioned === 1 ? "" : "s"} transitioned to VILLAGE_ALLOCATION_PENDING.`
          : "");
      setFeedback({ type: "success", message: successMsg });
      toast.success("Village distribution saved", { description: successMsg });

      // Reload the existing distribution view so the page reflects the saved state.
      const refreshed = await fetchVillageAllocations(wardAllocId);
      setExisting(refreshed);
      if (suggestion) setRows(rowsFromExisting(refreshed, suggestion));
    } catch (error) {
      const message = describeError(error);
      setFeedback({ type: "error", message });
      toast.error("Distribution failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="space-y-6 px-6 py-8">
        <p className="text-sm text-gray-600">Loading ward distribution screen…</p>
      </main>
    );
  }

  if (!program || !wardAllocation || !suggestion) {
    return (
      <main className="space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Ward allocation not found</CardTitle>
            <CardDescription>
              The ward allocation may have been removed or you may not have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/county/programs/${programId}/allocations` as Route}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              ← Back to ward allocations
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-6 py-8">
      <header className="space-y-2">
        <Link
          href={`/county/programs/${programId}/allocations` as Route}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          ← Ward allocations for {program.name}
        </Link>
        <h1 className="font-display text-2xl font-semibold text-brand-900">
          Distribute {wardAllocation.wardName} pool across villages
        </h1>
        <p className="max-w-3xl text-sm text-gray-600">
          The ward committee splits the {formatCurrencyKes(wardAllocation.allocatedKes)} pool across
          the villages below. The system has pre-filled a proportional split based on applicant
          count per village. Adjust as needed — the running total must equal the ward pool exactly
          (Invariant 2). Submit will be enabled when the totals match.
        </p>
      </header>

      <ContextSummary
        program={program}
        wardAllocation={wardAllocation}
        sumDraft={sumDraft}
        remaining={remaining}
        existing={existing}
      />

      <form onSubmit={submitDistribution} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Per-village allocation</CardTitle>
                <CardDescription>
                  {suggestion.totalApplicants} applicants across {rows.length} villages.
                  System proposed split is shown below; edit any cell to adjust.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={applyProportionalSuggestion}
                disabled={isSubmitting}
              >
                Reset to system suggestion
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.08em] text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Village</th>
                    <th className="px-3 py-2">Applicants</th>
                    <th className="px-3 py-2">Allocation (KES)</th>
                    <th className="px-3 py-2">% of ward pool</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((row) => {
                    const draftNumeric = Number(row.draftKes);
                    const pct =
                      wardPoolKes > 0 && Number.isFinite(draftNumeric)
                        ? (draftNumeric / wardPoolKes) * 100
                        : 0;
                    return (
                      <tr key={row.villageUnitId}>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          <div>{row.villageName}</div>
                          {row.villageCode ? (
                            <div className="text-xs text-gray-500">{row.villageCode}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.applicantCount}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={1}
                            value={row.draftKes}
                            onChange={(event) => updateRow(row.villageUnitId, event.target.value)}
                            className="w-44"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">{pct.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 text-xs uppercase tracking-[0.08em] text-gray-600">
                  <tr>
                    <td className="px-3 py-2 font-semibold">Total</td>
                    <td className="px-3 py-2">{suggestion.totalApplicants}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      {formatCurrencyKes(sumDraft)}
                    </td>
                    <td className="px-3 py-2">
                      {wardPoolKes > 0 ? `${((sumDraft / wardPoolKes) * 100).toFixed(2)}%` : "0.00%"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <BalanceBadge remaining={remaining} isBalanced={isBalanced} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution metadata</CardTitle>
            <CardDescription>
              Captured on the persisted village allocation rows for the audit trail.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Distribution method</span>
              <select
                value={distributionMethod}
                onChange={(event) => setDistributionMethod(event.target.value as DistributionMethod)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="PROPORTIONAL">Proportional (system suggestion)</option>
                <option value="MANUAL_OVERRIDE">Manual override</option>
                <option value="AI_WEIGHTED">AI-weighted</option>
              </select>
              <span className="text-xs text-gray-500">
                Recorded with each village_budget_allocation row.
              </span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Village allocation deadline (optional)</span>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
              <span className="text-xs text-gray-500">
                After this time, ward/county admins may override per §7.4 unavailability rules.
              </span>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-gray-700">Note (optional)</span>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Committee minutes reference, override justification, etc."
              />
            </label>
          </CardContent>
        </Card>

        {feedback ? (
          <div
            role="status"
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-success-200 bg-success-50 text-success-800"
                : "border-error-200 bg-error-50 text-error-800"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/county/programs/${programId}/allocations` as Route}
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? "Saving…" : "Save distribution"}
          </Button>
        </div>
      </form>

      {existing && existing.villages.length > 0 ? (
        <ExistingDistributionTable existing={existing} />
      ) : null}
    </main>
  );
}

function ContextSummary(props: {
  program: ProgramDetail;
  wardAllocation: WardAllocationRow;
  sumDraft: number;
  remaining: number;
  existing: VillageAllocationListResult | null;
}) {
  const { program, wardAllocation, sumDraft, remaining, existing } = props;
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <article className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Program</p>
        <p className="mt-1 font-display text-base font-semibold text-gray-900">{program.name}</p>
      </article>
      <article className="rounded-lg border border-brand-100 bg-brand-50 p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-brand-700">Ward pool</p>
        <p className="mt-1 font-display text-xl font-semibold text-brand-900">
          {formatCurrencyKes(wardAllocation.allocatedKes)}
        </p>
        <p className="text-xs text-brand-700/80">{wardAllocation.wardName}</p>
      </article>
      <article className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Draft total</p>
        <p className="mt-1 font-display text-xl font-semibold text-gray-900">
          {formatCurrencyKes(sumDraft)}
        </p>
        <p className="text-xs text-gray-500">
          {existing?.villages.length
            ? `Persisted: ${formatCurrencyKes(existing.totalDistributed)}`
            : "Not yet distributed"}
        </p>
      </article>
      <article
        className={`rounded-lg border p-3 ${
          Math.abs(remaining) < 0.01
            ? "border-success-200 bg-success-50"
            : "border-warning-200 bg-warning-50"
        }`}
      >
        <p
          className={`text-xs uppercase tracking-[0.12em] ${
            Math.abs(remaining) < 0.01 ? "text-success-700" : "text-warning-700"
          }`}
        >
          Remaining to balance
        </p>
        <p
          className={`mt-1 font-display text-xl font-semibold ${
            Math.abs(remaining) < 0.01 ? "text-success-900" : "text-warning-900"
          }`}
        >
          {formatCurrencyKes(remaining)}
        </p>
        <p
          className={`text-xs ${
            Math.abs(remaining) < 0.01 ? "text-success-700" : "text-warning-700"
          }`}
        >
          {Math.abs(remaining) < 0.01
            ? "Σ matches ward pool exactly."
            : remaining > 0
            ? "Unallocated remainder."
            : "Over-allocation — reduce one or more villages."}
        </p>
      </article>
    </section>
  );
}

function BalanceBadge(props: { remaining: number; isBalanced: boolean }) {
  if (props.isBalanced) {
    return (
      <p className="mt-3 text-sm font-medium text-success-700">
        ✓ Σ village allocations equals the ward pool. Ready to save.
      </p>
    );
  }
  return (
    <p className="mt-3 text-sm font-medium text-warning-700">
      Σ village allocations differs from the ward pool by{" "}
      <span className="font-semibold">{formatCurrencyKes(props.remaining)}</span>. Submit is
      disabled until the totals match (Invariant 2).
    </p>
  );
}

function ExistingDistributionTable(props: { existing: VillageAllocationListResult }) {
  const { existing } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Persisted village allocations ({existing.villages.length})</CardTitle>
        <CardDescription>
          Live values from the database. Updates above will overwrite these on save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-[0.08em] text-gray-600">
              <tr>
                <th className="px-3 py-2">Village</th>
                <th className="px-3 py-2">Allocated</th>
                <th className="px-3 py-2">Allocated to students</th>
                <th className="px-3 py-2">Disbursed</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {existing.villages.map((row) => {
                const remainingForStudents = row.allocatedKes - row.allocatedTotalKes;
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      <div>{row.villageName}</div>
                      {row.villageCode ? (
                        <div className="text-xs text-gray-500">{row.villageCode}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{formatCurrencyKes(row.allocatedKes)}</td>
                    <td className="px-3 py-2">
                      <div>{formatCurrencyKes(row.allocatedTotalKes)}</div>
                      <div
                        className={`text-xs ${
                          remainingForStudents <= 0 ? "text-success-700" : "text-warning-700"
                        }`}
                      >
                        {remainingForStudents <= 0
                          ? "Fully allocated"
                          : `${formatCurrencyKes(remainingForStudents)} remaining`}
                      </div>
                    </td>
                    <td className="px-3 py-2">{formatCurrencyKes(row.disbursedTotalKes)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{row.distributionMethod}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {row.villageAllocationDueAt
                        ? new Date(row.villageAllocationDueAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Suppress an unused-import warning in case TS strict mode trips on the type
// import being only used in an inline annotation above.
export type _Suggestion = VillageProportionalEntry;
