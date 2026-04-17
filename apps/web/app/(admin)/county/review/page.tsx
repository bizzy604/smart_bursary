import Link from "next/link";
import type { Route } from "next";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCountyReviewQueue } from "@/lib/admin-data";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";

export default function CountyReviewQueuePage() {
  const queue = getCountyReviewQueue().sort((a, b) => b.aiScore - a.aiScore);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">County Review Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Final approval stage for ward-recommended applications before disbursement.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="grid gap-3 lg:grid-cols-4">
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>All Wards</option>
            <option>Kalokol</option>
            <option>Nadapal</option>
          </select>
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>Sort: AI Score Desc</option>
            <option>Sort: Recommendation Amount</option>
          </select>
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>All Programs</option>
            <option>2026 Ward Bursary Programme</option>
          </select>
          <Input placeholder="Search by reference or applicant" />
        </div>
      </section>

      <section className="space-y-3">
        {queue.map((application) => (
          <article key={application.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-brand-900">{application.reference} • {application.applicantName}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {application.ward} Ward • {application.institution} • Submitted {formatShortDate(application.submittedAt)}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Ward recommendation: {formatCurrencyKes(application.wardRecommendationKes ?? 0)}
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

            <div className="mt-4">
              <Link href={`/county/review/${application.id}` as Route}>
                <Button size="sm">Final Review</Button>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
