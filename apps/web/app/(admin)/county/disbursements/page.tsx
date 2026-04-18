"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BudgetBar } from "@/components/application/budget-bar";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { fetchDashboardReport } from "@/lib/reporting-api";
import {
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

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
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

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            Ready for payout: <span className="font-semibold">{queue.length} applications</span> •
            Total <span className="font-semibold">{formatCurrencyKes(selectedTotal)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isLoading || isDisbursing || queue.length === 0}
              onClick={async () => {
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
              }}
            >
              {isDisbursing ? "Submitting..." : "Disburse via M-Pesa"}
            </Button>
            <Link href="/county/disbursements/batch">
              <Button variant="outline" size="sm">Export EFT Batch</Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-600">Loading approved applications...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {queue.map((application) => (
              <article key={application.applicationId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{application.reference} • {application.applicantName}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {application.wardName} Ward • Allocation {formatCurrencyKes(application.countyAllocationKes)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {application.reviewedAt ? `Approved ${formatShortDate(application.reviewedAt)}` : "Approved"}
                    </p>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
              </article>
            ))}
            {queue.length === 0 ? (
              <p className="text-sm text-gray-600">No approved applications are currently waiting for disbursement.</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
