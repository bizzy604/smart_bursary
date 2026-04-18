"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/format";
import { fetchWorkflowQueueByStatus } from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

export default function WardApplicationsPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadQueue = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchWorkflowQueueByStatus("WARD_REVIEW");
        if (!mounted) {
          return;
        }

        setQueue(rows);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load ward review queue.";
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

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Ward Applications Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review, recommend, return, or reject applications at ward committee level.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="grid gap-3 lg:grid-cols-4">
          <select aria-label="Filter applications by status" className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>All Statuses</option>
            <option>Ward Review</option>
          </select>
          <select aria-label="Filter applications by program" className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>All Programs</option>
            <option>2026 Ward Bursary Programme</option>
          </select>
          <select aria-label="Sort applications" className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>Sort: AI Score Desc</option>
            <option>Sort: Submitted Date</option>
          </select>
          <Input aria-label="Search applications" placeholder="Search by name, reference, or ward" />
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-xs">
          Loading ward queue...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">
          {error}
        </section>
      ) : queue.length === 0 ? (
        <EmptyState
          title="No applications in ward review"
          description="There are no applications currently waiting for ward committee decisions."
        />
      ) : (
        <section className="space-y-3">
          {queue.map((application) => (
            <article key={application.applicationId} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-brand-900">{application.reference} • {application.applicantName}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {application.wardName} Ward • {application.programName} • {application.educationLevel}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {application.reviewedAt
                    ? `Last updated ${formatShortDate(application.reviewedAt)}`
                    : "Awaiting ward committee review"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500">AI Score</p>
                <p className="font-display text-xl font-semibold text-brand-900">{application.aiScore.toFixed(1)}</p>
                <div className="mt-1">
                  <StatusBadge status={application.status} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/ward/applications/${application.applicationId}` as Route}>
                <Button size="sm">Review</Button>
              </Link>
              <Link href={`/ward/applications/${application.applicationId}/documents` as Route}>
                <Button variant="outline" size="sm">View Documents</Button>
              </Link>
              <Link href={`/ward/applications/${application.applicationId}/score` as Route}>
                <Button variant="ghost" size="sm">AI Score</Button>
              </Link>
            </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
