"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import { getProgramById } from "@/lib/student-data";

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const program = getProgramById(params.id);

  if (!program) {
    return (
      <EmptyState
        title="Program not found"
        description="This program may have been archived or removed from your eligibility list."
        action={
          <Link href="/programs">
            <Button>Back to Programs</Button>
          </Link>
        }
      />
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <p className="text-xs uppercase tracking-wide text-gray-500">Program Detail</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-900">{program.name}</h1>
        <p className="mt-2 text-sm text-gray-600">{program.summary}</p>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-brand-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Ward</dt>
            <dd className="mt-1 font-semibold text-brand-900">{program.ward}</dd>
          </div>
          <div className="rounded-lg bg-brand-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Deadline</dt>
            <dd className="mt-1 font-semibold text-brand-900">{formatShortDate(program.closesAt)}</dd>
          </div>
          <div className="rounded-lg bg-brand-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-gray-500">Budget Ceiling</dt>
            <dd className="mt-1 font-semibold text-brand-900">{formatCurrencyKes(program.budgetCeilingKes)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-xl font-semibold text-brand-900">Eligibility Highlights</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {program.eligibilityNotes.map((note) => (
            <li key={note} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent-500" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href={`/apply/${program.id}`}>
          <Button>Apply Now</Button>
        </Link>
        <Link href="/programs">
          <Button variant="outline">Back to Programs</Button>
        </Link>
      </section>
    </main>
  );
}
