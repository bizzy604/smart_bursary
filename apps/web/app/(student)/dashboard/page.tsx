import Link from "next/link";
import { ApplicationCard } from "@/components/application/application-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatPercent, formatShortDate } from "@/lib/format";
import { applications, programs } from "@/lib/student-data";

export default function DashboardPage() {
  const activePrograms = programs.length;
  const submittedApplications = applications.filter((application) => application.status !== "DRAFT").length;
  const inReview = applications.filter((application) => application.status.includes("REVIEW")).length;

  return (
    <main className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-brand-900 to-brand-700 p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-wider text-brand-100">Student Dashboard</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Welcome back, Aisha</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-50">
          Track your bursary journey, check open county programs, and review your application progress in one place.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard label="Open Programs" value={String(activePrograms)} hint="Currently accepting applications" />
        <StatsCard label="Submitted" value={String(submittedApplications)} hint="Applications sent for review" />
        <StatsCard label="In Review" value={String(inReview)} hint="Ward or county committee stage" />
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-brand-900">Open Programs</h2>
          <Link href="/programs">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </div>

        {programs.map((program) => {
          const utilization = (program.allocatedKes / program.budgetCeilingKes) * 100;

          return (
            <article key={program.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-900">{program.name}</h3>
                  <p className="text-sm text-gray-600">
                    {program.ward} • Closes {formatShortDate(program.closesAt)}
                  </p>
                </div>
                <Link href={`/programs/${program.id}`}>
                  <Button size="sm">View Program</Button>
                </Link>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatPercent(utilization)} allocated</span>
                  <span>{formatCurrencyKes(program.budgetCeilingKes)} budget</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-accent-500" style={{ width: `${Math.min(100, utilization)}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-brand-900">My Applications</h2>
          <Link href="/applications">
            <Button variant="ghost" size="sm">
              See all
            </Button>
          </Link>
        </div>

        {applications.length > 0 ? (
          <div className="space-y-3">
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No applications yet"
            description="Start with an open program to create your first bursary application."
            action={
              <Link href="/programs">
                <Button>Browse Programs</Button>
              </Link>
            }
          />
        )}
      </section>
    </main>
  );
}
