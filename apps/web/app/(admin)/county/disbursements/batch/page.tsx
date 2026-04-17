import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDisbursementQueue } from "@/lib/admin-data";
import { formatCurrencyKes } from "@/lib/format";

export default function CountyDisbursementBatchPage() {
  const queue = getDisbursementQueue();
  const totalKes = queue.reduce((sum, application) => sum + (application.countyAllocationKes ?? 0), 0);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">EFT Batch Export</h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate an RTGS-compatible payout file for approved applications in the current batch.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Batch Reference</dt>
            <dd className="font-medium text-gray-900">TRK-BATCH-2026-04-17</dd>
          </div>
          <div>
            <dt className="text-gray-500">Applications</dt>
            <dd className="font-medium text-gray-900">{queue.length}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Total Amount</dt>
            <dd className="font-medium text-gray-900">{formatCurrencyKes(totalKes)}</dd>
          </div>
        </dl>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Applicant</th>
                <th className="px-2 py-2">Ward</th>
                <th className="px-2 py-2">Allocation</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((application) => (
                <tr key={application.id} className="border-b border-gray-100">
                  <td className="px-2 py-2 font-medium text-brand-900">{application.reference}</td>
                  <td className="px-2 py-2 text-gray-700">{application.applicantName}</td>
                  <td className="px-2 py-2 text-gray-700">{application.ward}</td>
                  <td className="px-2 py-2 text-gray-700">{formatCurrencyKes(application.countyAllocationKes ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button>Download RTGS File</Button>
          <Button variant="outline">Download PDF Summary</Button>
          <Link href="/county/disbursements">
            <Button variant="ghost">Back to Disbursement Queue</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
