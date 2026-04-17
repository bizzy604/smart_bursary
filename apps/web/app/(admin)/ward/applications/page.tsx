import Link from "next/link";
import type { Route } from "next";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { getWardQueue } from "@/lib/admin-data";

export default function WardApplicationsPage() {
  const queue = getWardQueue().sort((a, b) => b.aiScore - a.aiScore);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Ward Applications Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review, recommend, return, or reject applications at ward committee level.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="grid gap-3 lg:grid-cols-4">
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>All Statuses</option>
            <option>Ward Review</option>
          </select>
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>All Programs</option>
            <option>2026 Ward Bursary Programme</option>
          </select>
          <select className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700">
            <option>Sort: AI Score Desc</option>
            <option>Sort: Submitted Date</option>
          </select>
          <Input placeholder="Search by name, reference, or ward" />
        </div>
      </section>

      <section className="space-y-3">
        {queue.map((application) => (
          <article key={application.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-brand-900">{application.reference} • {application.applicantName}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {application.ward} Ward • {application.subCounty} • {application.institution}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Requested {formatCurrencyKes(application.requestedKes)} • Submitted {formatShortDate(application.submittedAt)}
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

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/ward/applications/${application.id}` as Route}>
                <Button size="sm">Review</Button>
              </Link>
              <Link href={`/ward/applications/${application.id}/documents` as Route}>
                <Button variant="outline" size="sm">View Documents</Button>
              </Link>
              <Link href={`/ward/applications/${application.id}/score` as Route}>
                <Button variant="ghost" size="sm">AI Score</Button>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
