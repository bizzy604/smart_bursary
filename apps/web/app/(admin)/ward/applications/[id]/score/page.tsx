"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AIScoreCard } from "@/components/application/ai-score-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminApplicationById } from "@/lib/admin-data";

export default function WardApplicationScorePage() {
  const params = useParams<{ id: string }>();
  const application = getAdminApplicationById(params.id);

  if (!application) {
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
          <Link href={`/ward/applications/${application.id}`}>
            <Button variant="ghost" size="sm">Back to Application</Button>
          </Link>
        </div>
      </section>

      <AIScoreCard
        score={application.aiScore}
        grade={application.scoreGrade}
        dimensions={application.dimensions}
        anomalyFlags={application.anomalies}
      />
    </main>
  );
}
