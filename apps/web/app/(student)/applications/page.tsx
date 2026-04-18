"use client";

import Link from "next/link";
import { ApplicationCard } from "@/components/application/application-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useApplication } from "@/hooks/use-application";

export default function ApplicationsPage() {
  const { applications, isLoading, error } = useApplication();

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">My Applications</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review status, open details, and download your submitted bursary forms.
        </p>
      </section>

      {isLoading ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-xs">
          Loading applications...
        </section>
      ) : error ? (
        <section className="rounded-xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">
          {error}
        </section>
      ) : applications.length > 0 ? (
        <section className="space-y-3">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No applications available"
          description="You have not started any bursary application yet."
          action={
            <Link href="/programs">
              <Button>Find Open Programs</Button>
            </Link>
          }
        />
      )}
    </main>
  );
}
