"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes } from "@/lib/format";
import {
  exportEftBatch,
  fetchWorkflowQueueByStatus,
} from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

export default function CountyDisbursementBatchPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadQueue = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchWorkflowQueueByStatus("APPROVED");
        if (!mounted) {
          return;
        }

        setQueue(rows);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load disbursement batch data.";
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
  }, []);

  const totalKes = queue.reduce((sum, application) => sum + application.countyAllocationKes, 0);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">EFT Batch Export</h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate an RTGS-compatible payout file for approved applications in the current batch.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Batch Reference</dt>
            <dd className="font-medium text-gray-900">AUTO-EFT-{new Date().toISOString().slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Applications</dt>
            <dd className="font-medium text-gray-900">{queue.length}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Total Amount</dt>
            <dd className="font-medium text-gray-900">{formatCurrencyKes(totalKes)}</dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Applicant</th>
                <th className="px-2 py-2">Ward</th>
                <th className="px-2 py-2">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((application) => (
                <tr key={application.applicationId} className="border-b border-gray-100">
                  <td className="px-2 py-2 font-medium text-brand-900">{application.reference}</td>
                  <td className="px-2 py-2 text-gray-700">{application.applicantName}</td>
                  <td className="px-2 py-2 text-gray-700">{application.wardName}</td>
                  <td className="px-2 py-2 text-gray-700">{formatCurrencyKes(application.countyAllocationKes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && queue.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">No approved applications are available for export.</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={isLoading || isExporting || queue.length === 0}
            onClick={async () => {
              setIsExporting(true);
              try {
                const blob = await exportEftBatch(queue.map((item) => item.applicationId));
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `county-eft-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.append(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
              } finally {
                setIsExporting(false);
              }
            }}
          >
            {isExporting ? "Generating..." : "Download RTGS File"}
          </Button>
          <Button variant="outline" disabled>
            Download PDF Summary
          </Button>
          <Link href="/county/disbursements">
            <Button variant="ghost">Back to Disbursement Queue</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
