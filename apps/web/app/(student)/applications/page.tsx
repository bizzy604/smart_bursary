import Link from "next/link";
import { ApplicationCard } from "@/components/application/application-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { applications } from "@/lib/student-data";

export default function ApplicationsPage() {
  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">My Applications</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review status, open details, and download your submitted bursary forms.
        </p>
      </section>

      {applications.length > 0 ? (
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
