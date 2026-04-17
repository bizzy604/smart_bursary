import Link from "next/link";
import { BudgetBar } from "@/components/application/budget-bar";
import { StatusBadge } from "@/components/application/status-badge";
import { Button } from "@/components/ui/button";
import { countyBudgetSnapshot, getDisbursementQueue } from "@/lib/admin-data";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";

export default function CountyDisbursementsPage() {
  const queue = getDisbursementQueue();
  const selectedTotal = queue.reduce((sum, application) => sum + (application.countyAllocationKes ?? 0), 0);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Disbursement Queue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Approved applications pending payout through M-Pesa B2C or EFT batch export.
        </p>
      </section>

      <BudgetBar
        programName={countyBudgetSnapshot.programName}
        ceiling={countyBudgetSnapshot.ceilingKes}
        allocated={countyBudgetSnapshot.allocatedKes}
        disbursed={countyBudgetSnapshot.disbursedKes}
      />

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            Ready for payout: <span className="font-semibold">{queue.length} applications</span> •
            Total {" "}<span className="font-semibold">{formatCurrencyKes(selectedTotal)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Disburse via M-Pesa</Button>
            <Link href="/county/disbursements/batch">
              <Button variant="outline" size="sm">Export EFT Batch</Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {queue.map((application) => (
            <article key={application.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{application.reference} • {application.applicantName}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {application.ward} Ward • Allocation {formatCurrencyKes(application.countyAllocationKes ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Approved {formatShortDate(application.reviewedAt)}</p>
                </div>
                <StatusBadge status={application.status} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
