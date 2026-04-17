"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AIScoreCard } from "@/components/application/ai-score-card";
import { DocumentViewer } from "@/components/application/document-viewer";
import { ReviewPanel } from "@/components/application/review-panel";
import { StatusBadge } from "@/components/application/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminApplicationById } from "@/lib/admin-data";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";

export default function CountyReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const application = getAdminApplicationById(params.id);

  if (!application) {
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

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Final Allocation Review</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">{application.reference}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {application.applicantName} • {application.ward} Ward • Submitted {formatShortDate(application.submittedAt)}
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
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.wardRecommendationKes ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Requested Amount</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.requestedKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Outstanding Fees</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.outstandingKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Program</dt>
              <dd className="font-medium text-gray-900">{application.programName}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg border border-info-100 bg-info-50 p-3 text-sm text-info-700">
            Ward note: {application.reviewNote ?? "No additional note provided."}
          </p>
        </article>

        <AIScoreCard
          score={application.aiScore}
          grade={application.scoreGrade}
          dimensions={application.dimensions}
          anomalyFlags={application.anomalies}
        />
      </section>

      <DocumentViewer documents={application.documents} />

      <ReviewPanel
        mode="county"
        maxAmountKes={application.outstandingKes}
        defaultAmountKes={application.countyAllocationKes ?? application.wardRecommendationKes ?? application.requestedKes}
        existingNote={application.reviewNote}
      />
    </main>
  );
}
