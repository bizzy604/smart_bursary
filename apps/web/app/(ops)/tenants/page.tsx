"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsCard } from "@/components/shared/stats-card";
import { fetchOpsTenants, type OpsTenantSummary } from "@/lib/ops-api";
import {
  opsTenantColumns,
  opsTenantPlanOptions,
  opsTenantStatusOptions,
} from "./columns";

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

      {tenants.length === 0 && !isLoading && !error ? (
        <EmptyState
          title="No tenants available"
          description="No county tenants are currently provisioned in this environment."
        />
      ) : (
        <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
          <DataTable
            columns={opsTenantColumns}
            data={tenants}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => row.id}
            searchColumnId="countyName"
            searchPlaceholder="Search by county name"
            facetedFilters={[
              { columnId: "planTier", title: "Plan", options: opsTenantPlanOptions },
              { columnId: "status", title: "Status", options: opsTenantStatusOptions },
            ]}
            initialSorting={[{ id: "countyName", desc: false }]}
            initialPageSize={10}
            emptyState="No tenants match your filters."
          />
        </section>
      )}
    </main>
  );
}
