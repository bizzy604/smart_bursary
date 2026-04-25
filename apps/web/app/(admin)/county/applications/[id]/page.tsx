"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AIScoreCard } from "@/components/application/ai-score-card";
import { StatusBadge } from "@/components/application/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
  fetchReviewNotes,
  fetchReviewScoreCard,
  fetchReviewTimeline,
  fetchWorkflowApplicationById,
} from "@/lib/review-workflow-api";
import { useAuthStore } from "@/store/auth-store";
import type {
  ReviewNoteEntry,
  ReviewQueueItem,
  ReviewScoreCard,
  ReviewTimelineEvent,
} from "@/lib/review-types";

export default function CountyApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const userRole = useAuthStore((state) => state.user?.role);
  const [application, setApplication] = useState<ReviewQueueItem | null>(null);
  const [scoreCard, setScoreCard] = useState<ReviewScoreCard | null>(null);
  const [timeline, setTimeline] = useState<ReviewTimelineEvent[]>([]);
  const [reviewNotes, setReviewNotes] = useState<ReviewNoteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [summary, score, nextTimeline, notes] = await Promise.all([
          fetchWorkflowApplicationById(params.id),
          fetchReviewScoreCard(params.id),
          fetchReviewTimeline(params.id),
          fetchReviewNotes(params.id),
        ]);

        if (!mounted) {
          return;
        }

        setApplication(summary);
        setScoreCard(score);
        setTimeline(nextTimeline);
        setReviewNotes(notes);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load county application details.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const latestNote = useMemo(() => {
    const latestWithText = [...reviewNotes].reverse().find((note) => note.note.trim().length > 0);
    return latestWithText?.note;
  }, [reviewNotes]);

  const canOpenCountyReview = userRole === "FINANCE_OFFICER";

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-xs">
        Loading county application details...
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

  if (!application || !scoreCard) {
    return (
      <EmptyState
        title="Application not found"
        description="This application is unavailable in the county review scope."
        action={
          <Link href="/county/applications">
            <Button>Back to Applications</Button>
          </Link>
        }
      />
    );
  }

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">
              County Application Detail
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">
              {application.reference}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {application.applicantName} | {application.wardName} Ward | {application.programName}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canOpenCountyReview && application.status === "COUNTY_REVIEW" ? (
            <Link href={`/county/review/${application.applicationId}` as Route}>
              <Button variant="outline" size="sm">Open County Review</Button>
            </Link>
          ) : null}
          <Link href="/county/applications">
            <Button variant="ghost" size="sm">Back to Applications</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-brand-900">Applicant Snapshot</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Applicant</dt>
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

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-brand-900">Recommendation Context</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">AI Score</dt>
              <dd className="font-medium text-gray-900">{application.aiScore.toFixed(1)} / 100</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-gray-900">{application.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ward Recommendation</dt>
              <dd className="font-medium text-gray-900">
                {formatCurrencyKes(application.wardRecommendationKes)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">County Allocation</dt>
              <dd className="font-medium text-gray-900">
                {formatCurrencyKes(application.countyAllocationKes)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Last Reviewed</dt>
              <dd className="font-medium text-gray-900">
                {application.reviewedAt ? formatShortDate(application.reviewedAt) : "Pending"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg border border-info-100 bg-info-50 p-3 text-sm text-info-700">
            Latest note: {latestNote ?? "No review notes recorded yet for this application."}
          </p>
        </article>
      </section>

      <AIScoreCard
        score={scoreCard.score}
        grade={scoreCard.grade}
        dimensions={scoreCard.dimensions}
        anomalyFlags={scoreCard.anomalyFlags}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No timeline events are available for this application yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {timeline.map((event) => (
              <li key={event.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-brand-900">
                  {event.label} | {formatShortDate(event.date)}
                </p>
                <p className="mt-1 text-sm text-gray-600">{event.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
