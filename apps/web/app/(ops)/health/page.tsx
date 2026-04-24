"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { StatsCard } from "@/components/shared/stats-card";
import { formatShortDate } from "@/lib/format";
import {
  fetchOpsPlatformHealth,
  type OpsPlatformHealthSnapshot,
} from "@/lib/ops-api";
import { opsHealthColumns, opsHealthStatusOptions } from "./columns";

export default function OpsHealthPage() {
  const [snapshot, setSnapshot] = useState<OpsPlatformHealthSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadHealth = async () => {
      try {
        const payload = await fetchOpsPlatformHealth();
        if (!mounted) {
          return;
        }

        setSnapshot(payload);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load platform health snapshot.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadHealth();
    const intervalId = window.setInterval(() => {
      void loadHealth();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const services = snapshot?.services ?? [];

  const stats = useMemo(() => {
    return {
      healthy: services.filter((service) => service.status === "healthy").length,
      degraded: services.filter((service) => service.status === "degraded").length,
      down: services.filter((service) => service.status === "down").length,
    };
  }, [services]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">System Health Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Platform-wide service visibility across API, tenant provisioning, and tenant registry pipelines.
        </p>
        {snapshot ? (
          <p className="mt-2 text-xs text-gray-500">
            Last refresh {formatShortDate(snapshot.refreshedAt)} • {snapshot.totalTenants} tenants tracked
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Healthy Services" value={String(stats.healthy)} hint="All checks green" />
        <StatsCard label="Degraded" value={String(stats.degraded)} hint="Performance or latency risk" />
        <StatsCard label="Down" value={String(stats.down)} hint="Requires incident response" />
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Service Status</h2>
        <div className="mt-3">
          <DataTable
            columns={opsHealthColumns}
            data={services}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => row.name}
            searchColumnId="name"
            searchPlaceholder="Search service"
            facetedFilters={[{ columnId: "status", title: "Status", options: opsHealthStatusOptions }]}
            initialSorting={[{ id: "name", desc: false }]}
            initialPageSize={10}
            enablePagination={false}
            emptyState="No services are currently reporting health metrics."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Incident Feed</h2>
        {snapshot && snapshot.services.some((service) => service.status !== "healthy") ? (
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {snapshot.services
              .filter((service) => service.status !== "healthy")
              .map((service) => (
                <li key={service.name} className="rounded-lg border border-warning-100 bg-warning-50 p-3">
                  {service.name} is currently {service.status}. {service.note}
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            No active incidents. All monitored platform services are healthy.
          </p>
        )}
      </section>
    </main>
  );
}
