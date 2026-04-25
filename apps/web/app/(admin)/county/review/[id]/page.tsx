"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AIScoreCard } from "@/components/application/ai-score-card";
import { DocumentViewer } from "@/components/application/document-viewer";
import { ReviewPanel } from "@/components/application/review-panel";
import { StatusBadge } from "@/components/application/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
  fetchReviewDocuments,
  fetchReviewNotes,
  fetchReviewScoreCard,
  fetchWorkflowApplicationById,
  submitCountyReview,
} from "@/lib/review-workflow-api";
import { useAuthStore } from "@/store/auth-store";
import type {
  CountyReviewDecision,
  ReviewNoteEntry,
  ReviewQueueItem,
  ReviewScoreCard,
  SupportingDocument,
} from "@/lib/review-types";

const COUNTY_DECISION_MAP: Record<string, CountyReviewDecision> = {
  approve: "APPROVED",
  waitlist: "WAITLISTED",
  reject: "REJECTED",
};

export default function CountyReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const userRole = useAuthStore((state) => state.user?.role);
  const [application, setApplication] = useState<ReviewQueueItem | null>(null);
  const [scoreCard, setScoreCard] = useState<ReviewScoreCard | null>(null);
  const [reviewNotes, setReviewNotes] = useState<ReviewNoteEntry[]>([]);
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, score, notes] = await Promise.all([
        fetchWorkflowApplicationById(params.id),
        fetchReviewScoreCard(params.id),
        fetchReviewNotes(params.id),
      ]);

      setApplication(summary);
      setScoreCard(score);
      setReviewNotes(notes);
      setError(null);

      try {
        const docs = await fetchReviewDocuments(params.id);
        setDocuments(docs);
        setDocumentsError(null);
      } catch (reason: unknown) {
        const message = reason instanceof Error ? reason.message : "Failed to load supporting documents.";
        setDocuments([]);
        setDocumentsError(message);
      }
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Failed to load county review details.";
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
        Loading county review details...
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
        description="This county review record is unavailable."
        action={
          <Link href="/county/review">
            <Button>Back to County Queue</Button>
          </Link>
        }
      />
    );
  }

  const defaultAmountKes = Math.max(
    1,
    application.countyAllocationKes,
    application.wardRecommendationKes,
  );
  const maxAmountKes = Math.max(defaultAmountKes, 5000000);
  const canSubmitCountyDecision = userRole === "FINANCE_OFFICER";

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Final Allocation Review</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">{application.reference}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {application.applicantName} • {application.wardName} Ward •
              {application.reviewedAt ? ` Reviewed ${formatShortDate(application.reviewedAt)}` : " Pending"}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
        <div className="mt-3">
          <Link href="/county/review">
            <Button variant="ghost" size="sm">Back to County Queue</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-brand-900">Recommendation Summary</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Ward Recommendation</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.wardRecommendationKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Current Allocation</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.countyAllocationKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Program</dt>
              <dd className="font-medium text-gray-900">{application.programName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Education Level</dt>
              <dd className="font-medium text-gray-900">{application.educationLevel}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg border border-info-100 bg-info-50 p-3 text-sm text-info-700">
            Ward note: {latestNote ?? "No additional note provided."}
          </p>
        </article>

        <AIScoreCard
          score={scoreCard.score}
          grade={scoreCard.grade}
          dimensions={scoreCard.dimensions}
          anomalyFlags={scoreCard.anomalyFlags}
        />
      </section>

      {documentsError ? (
        <section className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
          {documentsError}
        </section>
      ) : null}
      <DocumentViewer documents={documents} />

      {canSubmitCountyDecision ? (
        <ReviewPanel
          mode="county"
          maxAmountKes={maxAmountKes}
          defaultAmountKes={defaultAmountKes}
          existingNote={latestNote}
          onSubmit={async (payload) => {
            const mappedDecision = COUNTY_DECISION_MAP[payload.decision];
            if (!mappedDecision) {
              throw new Error("Unsupported county decision.");
            }

            await submitCountyReview(params.id, mappedDecision, payload.recommendedAmount, payload.note);
            await loadApplication();
            return "County review submitted successfully.";
          }}
        />
      ) : (
        <section className="rounded-xl border border-info-100 bg-info-50 p-4 text-sm text-info-700">
          Read-only access: county administrators can view application review details, while only finance officers can submit county decisions.
        </section>
      )}
    </main>
  );
}
