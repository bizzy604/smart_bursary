"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import { getTenantBySlug } from "@/lib/ops-data";

function chipClasses(status: "healthy" | "degraded" | "down"): string {
  if (status === "healthy") {
    return "border-success-100 bg-success-50 text-success-700";
  }

  if (status === "degraded") {
    return "border-warning-100 bg-warning-50 text-warning-700";
  }

  return "border-danger-100 bg-danger-50 text-danger-700";
}

export default function TenantDetailPage() {
  const params = useParams<{ slug: string }>();
  const tenant = getTenantBySlug(params.slug);

  if (!tenant) {
    return (
      <EmptyState
        title="Tenant not found"
        description="The selected tenant is unavailable or does not exist in this environment."
        action={
          <Link href="/tenants">
            <Button>Back to Tenants</Button>
          </Link>
        }
      />
    );
  }

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">{tenant.countyName}</h1>
        <p className="mt-1 text-sm text-gray-600">{tenant.fundName}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Slug</dt>
            <dd className="font-medium text-gray-900">{tenant.slug}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Plan</dt>
            <dd className="font-medium text-gray-900">{tenant.plan}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Onboarded</dt>
            <dd className="font-medium text-gray-900">{formatShortDate(tenant.onboardedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Tenant Health Snapshot</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["API", tenant.health.api],
            ["Web", tenant.health.web],
            ["AI Scoring", tenant.health.aiScoring],
            ["Queue", tenant.health.queue],
          ].map(([label, status]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${chipClasses(status as "healthy" | "degraded" | "down")}`}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Operations Controls</h2>
        <p className="mt-1 text-sm text-gray-600">Tenant control actions are UI-complete and backend wiring will connect in API integration phase.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm">Recompute Tenant Metrics</Button>
          <Button variant="outline" size="sm">View Audit Log</Button>
          <Button variant="danger" size="sm">Suspend Tenant</Button>
          <Link href="/tenants">
            <Button variant="ghost" size="sm">Back to Tenants</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
