"use client";

import { useEffect, useMemo, useState } from "react";
import { StatsCard } from "@/components/shared/stats-card";
import { formatShortDate } from "@/lib/format";
import {
  fetchOpsPlatformHealth,
  type OpsPlatformHealthSnapshot,
} from "@/lib/ops-api";

function badge(status: "healthy" | "degraded" | "down"): string {
  if (status === "healthy") {
    return "border-success-100 bg-success-50 text-success-700";
  }

  if (status === "degraded") {
    return "border-warning-100 bg-warning-50 text-warning-700";
  }

  return "border-danger-100 bg-danger-50 text-danger-700";
}

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

  const stats = useMemo(() => {
    const services = snapshot?.services ?? [];
    return {
      healthy: services.filter((service) => service.status === "healthy").length,
      degraded: services.filter((service) => service.status === "degraded").length,
      down: services.filter((service) => service.status === "down").length,
    };
  }, [snapshot]);

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

      {isLoading ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-xs">
          Loading platform health metrics...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">
          {error}
        </section>
      ) : null}

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Service Status</h2>
        <div className="mt-4 space-y-3">
          {(snapshot?.services ?? []).map((service) => (
            <article key={service.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                <p className="mt-1 text-xs text-gray-500">Last update {formatShortDate(service.updatedAt)}</p>
                <p className="mt-1 text-xs text-gray-600">{service.note}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-700">{service.latencyMs} ms</p>
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${badge(service.status)}`}>
                  {service.status}
                </span>
              </div>
            </article>
          ))}
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
