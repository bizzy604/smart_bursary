"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/application/status-badge";
import { Timeline } from "@/components/application/timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { useApplication } from "@/hooks/use-application";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { getApplicationById, getTimelineForApplication, getProgramById } = useApplication();
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
  const program = getProgramById(application.programId);

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
          {application.status === "DRAFT" ? (
            <Link href={`/apply/${application.programId}`}>
              <Button size="sm">Continue Draft</Button>
            </Link>
          ) : null}
          <Link href={`/applications/${application.id}/pdf?download=true`}>
            <Button size="sm">Download PDF</Button>
          </Link>
          <Link href="/applications">
            <Button variant="outline" size="sm">
              Back to list
            </Button>
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-info-100 bg-info-50 p-5">
        <h2 className="font-display text-lg font-semibold text-info-700">Current Status</h2>
        <p className="mt-2 text-sm text-info-700">
          {application.status === "SUBMITTED"
            ? "Your application was submitted successfully and is awaiting workflow progression. You will receive an SMS update once review starts."
            : "Your application is currently moving through committee review. You will receive an SMS when a decision is made."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/applications/${application.id}/pdf?download=true`}>
            <Button variant="outline" size="sm">Download application PDF</Button>
          </Link>
          <a href="tel:+254700000000">
            <Button variant="ghost" size="sm">Contact ward office {program?.ward ? `(${program.ward})` : ""}</Button>
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-brand-900">Status Timeline</h2>
        <Timeline events={timeline} />
      </section>
    </main>
  );
}
