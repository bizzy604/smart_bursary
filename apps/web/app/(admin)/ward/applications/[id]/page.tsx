"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReviewPanel } from "@/components/application/review-panel";
import { StatusBadge } from "@/components/application/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
  fetchReviewNotes,
  fetchReviewTimeline,
  fetchWorkflowApplicationById,
  submitWardReview,
} from "@/lib/review-workflow-api";
import type {
  ReviewNoteEntry,
  ReviewQueueItem,
  ReviewTimelineEvent,
  WardReviewDecision,
} from "@/lib/review-types";

const WARD_DECISION_MAP: Record<string, WardReviewDecision> = {
  recommend: "RECOMMENDED",
  return: "RETURNED",
  reject: "REJECTED",
};

export default function WardApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<ReviewQueueItem | null>(null);
  const [timeline, setTimeline] = useState<ReviewTimelineEvent[]>([]);
  const [reviewNotes, setReviewNotes] = useState<ReviewNoteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, nextTimeline, nextNotes] = await Promise.all([
        fetchWorkflowApplicationById(params.id),
        fetchReviewTimeline(params.id),
        fetchReviewNotes(params.id),
      ]);

      setApplication(summary);
      setTimeline(nextTimeline);
      setReviewNotes(nextNotes);
      setError(null);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Failed to load ward review details.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const latestNote = useMemo(() => {
    const latestWithText = [...reviewNotes].reverse().find((note) => note.note.trim().length > 0);
    return latestWithText?.note;
  }, [reviewNotes]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-xs">
        Loading ward review details...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-sm text-danger-700">
        {error}
      </section>
    );
  }

  if (!application) {
    return (
      <EmptyState
        title="Application not found"
        description="This application record is unavailable or has moved outside your ward scope."
        action={
          <Link href="/ward/applications">
            <Button>Back to Ward Queue</Button>
          </Link>
        }
      />
    );
  }

  const maxAmountKes = Math.max(
    1,
    application.wardRecommendationKes,
    application.countyAllocationKes,
    500000,
  );
  const defaultAmountKes = Math.max(
    1,
    application.wardRecommendationKes,
    application.countyAllocationKes,
  );

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Application Review</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">{application.reference}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {application.applicantName} • {application.wardName} Ward • {application.programName}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/ward/applications/${application.applicationId}/documents` as Route}>
            <Button variant="outline" size="sm">Documents</Button>
          </Link>
          <Link href={`/ward/applications/${application.applicationId}/score` as Route}>
            <Button variant="outline" size="sm">AI Score</Button>
          </Link>
          <Link href="/ward/applications">
            <Button variant="ghost" size="sm">Back to Queue</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-brand-900">Applicant Snapshot</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Full Name</dt>
              <dd className="font-medium text-gray-900">{application.applicantName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ward</dt>
              <dd className="font-medium text-gray-900">{application.wardName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Program</dt>
              <dd className="font-medium text-gray-900">{application.programName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Academic Year</dt>
              <dd className="font-medium text-gray-900">{application.academicYear}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Education Level</dt>
              <dd className="font-medium text-gray-900">{application.educationLevel}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Reviewer Stage</dt>
              <dd className="font-medium text-gray-900">{application.reviewerStage}</dd>
            </div>
          </dl>
        </article>

        <article className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-brand-900">Review Context</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">AI Score</dt>
              <dd className="font-medium text-gray-900">{application.aiScore.toFixed(1)} / 100</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ward Recommendation</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.wardRecommendationKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">County Allocation</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.countyAllocationKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="font-medium text-gray-900">
                {application.reviewedAt ? formatShortDate(application.reviewedAt) : "Pending"}
              </dd>
            </div>
          </dl>
          <p className="rounded-lg border border-info-100 bg-info-50 p-3 text-sm text-info-700">
            Latest note: {latestNote ?? "No review notes recorded yet for this application."}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No timeline events are available for this application yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {timeline.map((event) => (
              <li key={event.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-brand-900">{event.label} • {formatShortDate(event.date)}</p>
                <p className="mt-1 text-sm text-gray-600">{event.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReviewPanel
        mode="ward"
        maxAmountKes={maxAmountKes}
        defaultAmountKes={defaultAmountKes}
        existingNote={latestNote}
        onSubmit={async (payload) => {
          const mappedDecision = WARD_DECISION_MAP[payload.decision];
          if (!mappedDecision) {
            throw new Error("Unsupported ward decision.");
          }

          await submitWardReview(params.id, mappedDecision, payload.recommendedAmount, payload.note);
          await loadApplication();
          return "Ward review submitted successfully.";
        }}
      />
    </main>
  );
}
