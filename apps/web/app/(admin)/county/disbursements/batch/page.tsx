"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  const [confirmExport, setConfirmExport] = useState(false);

  const exportBatch = async () => {
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
      toast.success("EFT batch exported", {
        description: `Generated payout file for ${queue.length} application${queue.length === 1 ? "" : "s"}.`,
      });
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Failed to export EFT batch.";
      toast.error("Export failed", { description: message });
    } finally {
      setIsExporting(false);
      setConfirmExport(false);
    }
  };

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
      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <h1 className="font-serif text-2xl font-semibold text-primary">EFT Batch Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate an RTGS-compatible payout file for approved applications in the current batch.
        </p>
      </section>

      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Batch Reference</dt>
            <dd className="font-medium text-foreground">AUTO-EFT-{new Date().toISOString().slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Applications</dt>
            <dd className="font-medium text-foreground">{queue.length}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total Amount</dt>
            <dd className="font-medium text-foreground">{formatCurrencyKes(totalKes)}</dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Applicant</th>
                <th className="px-2 py-2">Ward</th>
                <th className="px-2 py-2">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((application) => (
                <tr key={application.applicationId} className="border-b border-border">
                  <td className="px-2 py-2 font-medium text-primary">{application.reference}</td>
                  <td className="px-2 py-2 text-foreground/90">{application.applicantName}</td>
                  <td className="px-2 py-2 text-foreground/90">{application.wardName}</td>
                  <td className="px-2 py-2 text-foreground/90">{formatCurrencyKes(application.countyAllocationKes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && queue.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No approved applications are available for export.</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={isLoading || isExporting || queue.length === 0}
            onClick={() => setConfirmExport(true)}
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

      <AlertDialog
        open={confirmExport}
        onOpenChange={(open) => !isExporting && setConfirmExport(open)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Generate EFT batch file</AlertDialogTitle>
            <AlertDialogDescription>
              Download an RTGS payout file for {queue.length} application
              {queue.length === 1 ? "" : "s"} totalling {formatCurrencyKes(totalKes)}.
              The file should be uploaded to your bank&apos;s EFT portal to complete payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={isExporting}
                onClick={(event) => {
                  event.preventDefault();
                  void exportBatch();
                }}
              >
                {isExporting ? "Generating..." : "Download RTGS File"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
