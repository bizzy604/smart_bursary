"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AIScoreCard } from "@/components/application/ai-score-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  fetchReviewScoreCard,
  fetchWorkflowApplicationById,
} from "@/lib/review-workflow-api";
import type { ReviewQueueItem, ReviewScoreCard } from "@/lib/review-types";

export default function WardApplicationScorePage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<ReviewQueueItem | null>(null);
  const [scoreCard, setScoreCard] = useState<ReviewScoreCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadScore = async () => {
      setIsLoading(true);
      try {
        const [summary, score] = await Promise.all([
          fetchWorkflowApplicationById(params.id),
          fetchReviewScoreCard(params.id),
        ]);

        if (!mounted) {
          return;
        }

        setApplication(summary);
        setScoreCard(score);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load AI score card.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadScore();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-xs">
        Loading AI score details...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">
        {error}
      </section>
    );
  }

  if (!application || !scoreCard) {
    return (
      <EmptyState
        title="Application not found"
        description="No AI scoring record is available for this application."
        action={
          <Link href="/ward/applications">
            <Button>Back to Ward Queue</Button>
          </Link>
        }
      />
    );
  }

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">AI Score Breakdown • {application.reference}</h1>
        <p className="mt-1 text-sm text-gray-600">Use this recommendation as guidance alongside committee judgement and document checks.</p>
        <div className="mt-3">
          <Link href={`/ward/applications/${application.applicationId}`}>
            <Button variant="ghost" size="sm">Back to Application</Button>
          </Link>
        </div>
      </section>

      <AIScoreCard
        score={scoreCard.score}
        grade={scoreCard.grade}
        dimensions={scoreCard.dimensions}
        anomalyFlags={scoreCard.anomalyFlags}
      />
    </main>
  );
}
