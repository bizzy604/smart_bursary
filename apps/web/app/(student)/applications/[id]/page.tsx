"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApplicationPdfButton } from "@/components/application/application-pdf-button";
import { StatusBadge } from "@/components/application/status-badge";
import { Timeline } from "@/components/application/timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { toPreviewSections } from "@/lib/application-preview";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
  fetchStudentApplicationDetail,
  fetchStudentApplicationTimeline,
} from "@/lib/student-api";
import type { StudentApplicationDetail, TimelineEvent } from "@/lib/student-types";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<StudentApplicationDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadApplication() {
      setIsLoading(true);
      try {
        const [nextApplication, nextTimeline] = await Promise.all([
          fetchStudentApplicationDetail(params.id),
          fetchStudentApplicationTimeline(params.id),
        ]);

        if (!mounted) {
          return;
        }

        setApplication(nextApplication);
        setTimeline(nextTimeline);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load application details.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadApplication();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const previewSections = useMemo(() => {
    if (!application) {
      return [];
    }

    const sectionRecord: Record<string, unknown> = {};
    for (const section of application.sections) {
      sectionRecord[section.sectionKey] = section.data;
    }

    return toPreviewSections(sectionRecord);
  }, [application]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Loading application details...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-sm text-danger-700">
        {error}
      </section>
    );
  }

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

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
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
          <ApplicationPdfButton
            programName={application.programName}
            reference={application.reference}
            generatedAt={application.updatedAt}
            sections={previewSections}
            size="sm"
          />
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
          {application.status === "DRAFT"
            ? "Your application is still in draft. Complete all sections and submit to move into committee review."
            : application.status === "SUBMITTED"
              ? "Your application was submitted successfully and is awaiting workflow progression. You will receive an SMS update once review starts."
              : "Your application is currently moving through committee review. You will receive an SMS when a decision is made."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ApplicationPdfButton
            programName={application.programName}
            reference={application.reference}
            generatedAt={application.updatedAt}
            sections={previewSections}
            label="Download application PDF"
            variant="outline"
            size="sm"
          />
          <a href="tel:+254700000000">
            <Button variant="ghost" size="sm">Contact ward office</Button>
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
