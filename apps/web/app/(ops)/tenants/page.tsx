"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import { fetchOpsTenants, type OpsTenantSummary } from "@/lib/ops-api";

function statusClasses(status: "active" | "inactive"): string {
  if (status === "active") {
    return "border-success-100 bg-success-50 text-success-700";
  }

  return "border-danger-100 bg-danger-50 text-danger-700";
}

export default function OpsTenantsPage() {
  const [tenants, setTenants] = useState<OpsTenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTenants = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchOpsTenants();
        if (!mounted) {
          return;
        }

        setTenants(rows);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load tenant registry.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTenants();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.isActive).length;
    const inactive = tenants.length - active;
    const enterprise = tenants.filter((tenant) => tenant.planTier === "ENTERPRISE").length;

    return {
      active,
      inactive,
      enterprise,
    };
  }, [tenants]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Tenant Registry</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor county tenants, subscription tiers, and onboarding posture from one operations console.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Active Tenants" value={String(stats.active)} hint="Counties currently enabled" />
        <StatsCard label="Inactive" value={String(stats.inactive)} hint="Suspended or disabled counties" />
        <StatsCard label="Enterprise" value={String(stats.enterprise)} hint="Top-tier subscriptions" />
      </section>

      {isLoading ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-xs">
          Loading tenant registry...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">
          {error}
        </section>
      ) : tenants.length === 0 ? (
        <EmptyState
          title="No tenants available"
          description="No county tenants are currently provisioned in this environment."
        />
      ) : (
        <section className="space-y-3">
          {tenants.map((tenant) => {
            const status = tenant.isActive ? "active" : "inactive";

            return (
              <article key={tenant.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-brand-900">{tenant.countyName}</h2>
                    <p className="mt-1 text-sm text-gray-600">Plan {tenant.planTier} • Slug {tenant.slug}</p>
                    <p className="mt-1 text-xs text-gray-500">Provisioned {formatShortDate(tenant.createdAt)}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${statusClasses(status)}`}>
                    {status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                  <p>Users: <span className="font-semibold">{tenant.userCount}</span></p>
                  <p>Wards: <span className="font-semibold">{tenant.wardCount}</span></p>
                  <p>Plan Tier: <span className="font-semibold">{tenant.planTier}</span></p>
                  <p>Tenant Slug: <span className="font-semibold">{tenant.slug}</span></p>
                </div>

                <div className="mt-4">
                  <Link href={`/tenants/${tenant.slug}` as Route}>
                    <Button size="sm">Open Tenant Detail</Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
