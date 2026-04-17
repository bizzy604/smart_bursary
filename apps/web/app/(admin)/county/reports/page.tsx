import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import { reportMeta } from "@/lib/reporting-data";

export default function CountyReportsPage() {
  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">County Reports Hub</h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate OCOB-ready exports and ward performance summaries for finance and audit workflows.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Finance Compliance</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-brand-900">OCOB Report</h2>
          <p className="mt-2 text-sm text-gray-600">
            Structured county-wide allocation and disbursement summary formatted for OCOB submissions.
          </p>
          <div className="mt-4">
            <Link href="/county/reports/ocob">
              <Button size="sm">Open OCOB Report</Button>
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Ward Operations</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-brand-900">Ward Summary Exports</h2>
          <p className="mt-2 text-sm text-gray-600">
            Application, approval, rejection, and disbursement breakdown by ward for committee meetings.
          </p>
          <div className="mt-4">
            <Link href="/ward/reports">
              <Button variant="outline" size="sm">Open Ward Reports</Button>
            </Link>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h3 className="font-display text-lg font-semibold text-brand-900">Latest Generated Report Snapshot</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Program</dt>
            <dd className="font-medium text-gray-900">{reportMeta.programName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Academic Year</dt>
            <dd className="font-medium text-gray-900">{reportMeta.academicYear}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Generated</dt>
            <dd className="font-medium text-gray-900">{formatShortDate(reportMeta.generatedAt)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
