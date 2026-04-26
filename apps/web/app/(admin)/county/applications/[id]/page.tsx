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
      <section className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground shadow-xs">
        Loading county application details...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
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
      <section className="rounded-2xl border border-border/80 bg-background p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">
              County Application Detail
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-primary">
              {application.reference}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
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
        <article className="rounded-2xl border border-border bg-background p-5 shadow-xs">
          <h2 className="font-serif text-lg font-semibold text-primary">Applicant Snapshot</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Applicant</dt>
              <dd className="font-medium text-foreground">{application.applicantName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ward</dt>
              <dd className="font-medium text-foreground">{application.wardName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Program</dt>
              <dd className="font-medium text-foreground">{application.programName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Academic Year</dt>
              <dd className="font-medium text-foreground">{application.academicYear}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Education Level</dt>
              <dd className="font-medium text-foreground">{application.educationLevel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reviewer Stage</dt>
              <dd className="font-medium text-foreground">{application.reviewerStage}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border border-border bg-background p-5 shadow-xs">
          <h2 className="font-serif text-lg font-semibold text-primary">Recommendation Context</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">AI Score</dt>
              <dd className="font-medium text-foreground">{application.aiScore.toFixed(1)} / 100</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium text-foreground">{application.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ward Recommendation</dt>
              <dd className="font-medium text-foreground">
                {formatCurrencyKes(application.wardRecommendationKes)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">County Allocation</dt>
              <dd className="font-medium text-foreground">
                {formatCurrencyKes(application.countyAllocationKes)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Reviewed</dt>
              <dd className="font-medium text-foreground">
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

      <section className="rounded-2xl border border-border bg-background p-5 shadow-xs">
        <h2 className="font-serif text-lg font-semibold text-primary">Timeline</h2>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No timeline events are available for this application yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {timeline.map((event) => (
              <li key={event.id} className="rounded-lg border border-border bg-muted p-3">
                <p className="text-sm font-semibold text-primary">
                  {event.label} | {formatShortDate(event.date)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
