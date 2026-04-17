import Link from "next/link";
import type { Route } from "next";
import { StatusBadge } from "@/components/application/status-badge";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { getWardDashboardStats, getWardQueue } from "@/lib/admin-data";

export default function WardDashboardPage() {
  const stats = getWardDashboardStats();
  const queue = getWardQueue();

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Ward Dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">Application Review Command Center</h1>
        <p className="mt-2 text-sm text-gray-600">
          Applications are ranked by AI score to help committee members prioritize high-need cases quickly.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Pending Review" value={String(stats.pending)} hint="Waiting in ward queue" />
        <StatsCard label="Reviewed Today" value={String(stats.reviewedToday)} hint="Committee decisions logged" />
        <StatsCard label="Rejected" value={String(stats.rejected)} hint="This cycle so far" />
        <StatsCard
          label="Recommended Amount"
          value={formatCurrencyKes(stats.recommendedKes)}
          hint="Total proposed to county"
        />
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-brand-900">Top Priority Applications</h2>
            <p className="text-sm text-gray-600">Sorted by AI score from highest need to lowest.</p>
          </div>
          <Link href="/ward/applications">
            <Button variant="outline" size="sm">Open Full Queue</Button>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {queue.map((application) => (
            <article key={application.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{application.reference} • {application.applicantName}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {application.ward} Ward • {application.institution} • Requested {formatCurrencyKes(application.requestedKes)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Submitted {formatShortDate(application.submittedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI Score</p>
                  <p className="font-display text-lg font-semibold text-brand-900">{application.aiScore.toFixed(1)} / 100</p>
                  <div className="mt-1">
                    <StatusBadge status={application.status} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/ward/applications/${application.id}` as Route}>
                  <Button size="sm">Review</Button>
                </Link>
                <Link href={`/ward/applications/${application.id}/documents` as Route}>
                  <Button variant="outline" size="sm">View Documents</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
