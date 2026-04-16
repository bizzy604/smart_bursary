"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/application/status-badge";
import { Timeline } from "@/components/application/timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { getApplicationById, getTimelineForApplication } from "@/lib/student-data";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const application = getApplicationById(params.id);

  if (!application) {
    return (
      <EmptyState
        title="Application not found"
        description="The requested application may not belong to your account."
        action={
          <Link href="/applications">
            <Button>Back to Applications</Button>
          </Link>
        }
      />
    );
  }

  const timeline = getTimelineForApplication(application.id);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-gray-500">{application.reference}</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-brand-900">{application.programName}</h1>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <dl className="mt-5 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Requested</dt>
            <dd className="mt-1 font-semibold text-brand-900">{formatCurrencyKes(application.requestedKes)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Submitted</dt>
            <dd className="mt-1 font-semibold text-brand-900">{formatShortDate(application.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Updated</dt>
            <dd className="mt-1 font-semibold text-brand-900">{formatShortDate(application.updatedAt)}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/applications/${application.id}/pdf`}>
            <Button size="sm">Download PDF</Button>
          </Link>
          <Link href="/applications">
            <Button variant="outline" size="sm">
              Back to list
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-brand-900">Status Timeline</h2>
        <Timeline events={timeline} />
      </section>
    </main>
  );
}
