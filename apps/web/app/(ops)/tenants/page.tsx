import Link from "next/link";
import type { Route } from "next";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import { tenants } from "@/lib/ops-data";

function statusClasses(status: "active" | "trial" | "suspended"): string {
  if (status === "active") {
    return "border-success-100 bg-success-50 text-success-700";
  }

  if (status === "trial") {
    return "border-info-100 bg-info-50 text-info-700";
  }

  return "border-danger-100 bg-danger-50 text-danger-700";
}

export default function OpsTenantsPage() {
  const activeCount = tenants.filter((tenant) => tenant.status === "active").length;
  const trialCount = tenants.filter((tenant) => tenant.status === "trial").length;
  const suspendedCount = tenants.filter((tenant) => tenant.status === "suspended").length;

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Tenant Registry</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor county tenants, subscription status, and environment health from one operations console.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Active Tenants" value={String(activeCount)} hint="Production counties" />
        <StatsCard label="Trials" value={String(trialCount)} hint="Onboarding in progress" />
        <StatsCard label="Suspended" value={String(suspendedCount)} hint="Requires operator action" />
      </section>

      <section className="space-y-3">
        {tenants.map((tenant) => (
          <article key={tenant.slug} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-brand-900">{tenant.countyName}</h2>
                <p className="mt-1 text-sm text-gray-600">{tenant.fundName} • Plan {tenant.plan}</p>
                <p className="mt-1 text-xs text-gray-500">Onboarded {formatShortDate(tenant.onboardedAt)}</p>
              </div>
              <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${statusClasses(tenant.status)}`}>
                {tenant.status}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
              <p>Active users: <span className="font-semibold">{tenant.activeUsers}</span></p>
              <p>Applications: <span className="font-semibold">{tenant.applicationsThisCycle}</span></p>
              <p>API: <span className="font-semibold capitalize">{tenant.health.api}</span></p>
              <p>AI scoring: <span className="font-semibold capitalize">{tenant.health.aiScoring}</span></p>
            </div>

            <div className="mt-4">
              <Link href={`/tenants/${tenant.slug}` as Route}>
                <Button size="sm">Open Tenant Detail</Button>
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
