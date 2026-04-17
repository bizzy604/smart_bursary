import Link from "next/link";
import type { Route } from "next";
import { BudgetBar } from "@/components/application/budget-bar";
import { StatusBadge } from "@/components/application/status-badge";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { countyBudgetSnapshot, getCountyDashboardStats, getCountyReviewQueue } from "@/lib/admin-data";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";

export default function CountyDashboardPage() {
  const stats = getCountyDashboardStats();
  const queue = getCountyReviewQueue();

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">County Dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">Finance Officer Review Portal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor county allocations, track review throughput, and push approved records to disbursement.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Approved" value={String(stats.approved)} hint="Approved applications this cycle" />
        <StatsCard label="Allocated" value={formatCurrencyKes(stats.allocatedKes)} hint="Total allocated amount" />
        <StatsCard label="Remaining" value={formatCurrencyKes(stats.remainingKes)} hint="Budget still available" />
        <StatsCard label="Disbursed" value={String(stats.disbursed)} hint="Applications already paid" />
      </section>

      <BudgetBar
        programName={countyBudgetSnapshot.programName}
        ceiling={countyBudgetSnapshot.ceilingKes}
        allocated={countyBudgetSnapshot.allocatedKes}
        disbursed={countyBudgetSnapshot.disbursedKes}
      />

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-brand-900">County Review Queue</h2>
            <p className="text-sm text-gray-600">Applications recommended by ward committees and awaiting final decision.</p>
          </div>
          <Link href="/county/review">
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
                    Ward recommendation: {formatCurrencyKes(application.wardRecommendationKes ?? 0)} • Submitted {formatShortDate(application.submittedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">AI Score</p>
                  <p className="font-display text-lg font-semibold text-brand-900">{application.aiScore.toFixed(1)}</p>
                  <div className="mt-1">
                    <StatusBadge status={application.status} />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Link href={`/county/review/${application.id}` as Route}>
                  <Button size="sm">Final Review</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
