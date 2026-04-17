"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { ReviewPanel } from "@/components/application/review-panel";
import { StatusBadge } from "@/components/application/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { getAdminApplicationById } from "@/lib/admin-data";

export default function WardApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const application = getAdminApplicationById(params.id);

  if (!application) {
    return (
      <EmptyState
        title="Application not found"
        description="This application record is unavailable or has been archived."
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
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Application Review</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-brand-900">{application.reference}</h1>
            <p className="mt-1 text-sm text-gray-600">{application.applicantName} • {application.ward} Ward • {application.institution}</p>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/ward/applications/${application.id}/documents` as Route}>
            <Button variant="outline" size="sm">Documents</Button>
          </Link>
          <Link href={`/ward/applications/${application.id}/score` as Route}>
            <Button variant="outline" size="sm">AI Score</Button>
          </Link>
          <Link href="/ward/applications">
            <Button variant="ghost" size="sm">Back to Queue</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-brand-900">Applicant Details</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Full Name</dt>
              <dd className="font-medium text-gray-900">{application.applicantName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ward / Sub-county</dt>
              <dd className="font-medium text-gray-900">{application.ward} / {application.subCounty}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Institution</dt>
              <dd className="font-medium text-gray-900">{application.institution}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Course / Level</dt>
              <dd className="font-medium text-gray-900">{application.course} ({application.educationLevel})</dd>
            </div>
            <div>
              <dt className="text-gray-500">Admission No.</dt>
              <dd className="font-medium text-gray-900">{application.admissionNumber}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Year of Study</dt>
              <dd className="font-medium text-gray-900">{application.yearOfStudy}</dd>
            </div>
          </dl>
        </article>

        <article className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="font-display text-lg font-semibold text-brand-900">Financial and Family Context</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Requested Amount</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.requestedKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Outstanding Fees</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.outstandingKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Household Income</dt>
              <dd className="font-medium text-gray-900">{formatCurrencyKes(application.guardianIncomeKes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Siblings in School</dt>
              <dd className="font-medium text-gray-900">{application.siblingsInSchool}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Family Status</dt>
              <dd className="font-medium text-gray-900">{application.familyStatus}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Submitted</dt>
              <dd className="font-medium text-gray-900">{formatShortDate(application.submittedAt)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Timeline</h2>
        <ul className="mt-4 space-y-3">
          {application.timeline.map((event) => (
            <li key={event.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-brand-900">{event.label} • {formatShortDate(event.date)}</p>
              <p className="mt-1 text-sm text-gray-600">{event.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <ReviewPanel
        mode="ward"
        maxAmountKes={application.outstandingKes}
        defaultAmountKes={application.wardRecommendationKes ?? application.requestedKes}
        existingNote={application.reviewNote}
      />
    </main>
  );
}
