import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatPercent, formatShortDate } from "@/lib/format";
import { programs } from "@/lib/student-data";

export default function ProgramsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">Eligible Programs</h1>
        <p className="mt-2 text-sm text-gray-600">
          These programs match your current profile and ward scope. Open one to review details before applying.
        </p>
      </section>

      <section className="grid gap-4">
        {programs.map((program) => {
          const utilization = (program.allocatedKes / program.budgetCeilingKes) * 100;

          return (
            <article key={program.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-brand-900">{program.name}</h2>
                  <p className="text-sm text-gray-600">{program.summary}</p>
                </div>
                <Link href={`/programs/${program.id}`}>
                  <Button size="sm">Open</Button>
                </Link>
              </div>

              <dl className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Ward Scope</dt>
                  <dd className="mt-1 font-medium text-gray-800">{program.ward}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Deadline</dt>
                  <dd className="mt-1 font-medium text-gray-800">{formatShortDate(program.closesAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Budget Ceiling</dt>
                  <dd className="mt-1 font-medium text-gray-800">{formatCurrencyKes(program.budgetCeilingKes)}</dd>
                </div>
              </dl>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatPercent(utilization)} allocated</span>
                  <span>{formatCurrencyKes(program.allocatedKes)} committed</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, utilization)}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
