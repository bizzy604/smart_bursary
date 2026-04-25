"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import { shouldUsePieChart } from "@/components/dashboard/chart-utils";
import { DataTable } from "@/components/shared/data-table";
import { Activity, AlertTriangle, CheckCircle2, XOctagon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatShortDate } from "@/lib/format";
import {
  fetchOpsPlatformHealth,
  type OpsPlatformHealthSnapshot,
} from "@/lib/ops-api";
import { opsHealthColumns } from "./columns";

const opsHealthLatencyConfig = {
  latency: {
    label: "Latency (ms)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function OpsHealthPage() {
  const [snapshot, setSnapshot] = useState<OpsPlatformHealthSnapshot | null>(
    null,
  );
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

        const message =
          reason instanceof Error
            ? reason.message
            : "Failed to load platform health snapshot.";
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
      healthy: services.filter((service) => service.status === "healthy")
        .length,
      degraded: services.filter((service) => service.status === "degraded")
        .length,
      down: services.filter((service) => service.status === "down").length,
    };
  }, [services]);
  const serviceLatencyData = useMemo(
    () =>
      services.map((service) => ({
        service: service.name,
        latency: service.latencyMs,
        fill:
          service.status === "healthy"
            ? "var(--chart-3)"
            : service.status === "degraded"
              ? "var(--chart-2)"
              : "var(--chart-4)",
      })),
    [services],
  );
  const showLatencyPieChart = shouldUsePieChart(serviceLatencyData.length);

  return (
    <main className="space-y-5">
      <div>
        <PageHeader
          eyebrow="Operations"
          title="System Health Dashboard"
          description="Platform-wide service visibility across API, tenant provisioning, and tenant registry pipelines."
          icon={Activity}
        />
        {snapshot ? (
          <p className="mt-2 text-xs text-gray-500">
            Last refresh {formatShortDate(snapshot.refreshedAt)} •{" "}
            {snapshot.totalTenants} tenants tracked
          </p>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Healthy Services"
          value={String(stats.healthy)}
          hint="All checks green"
          icon={CheckCircle2}
          intent="success"
        />
        <StatsCard
          label="Degraded"
          value={String(stats.degraded)}
          hint="Performance or latency risk"
          icon={AlertTriangle}
          intent="warning"
        />
        <StatsCard
          label="Down"
          value={String(stats.down)}
          hint="Requires incident response"
          icon={XOctagon}
          intent="danger"
        />
      </section>

      <DashboardChartCard
        eyebrow="Runtime Signals"
        title="Live service latency snapshot"
        description="This compares monitored platform services by current response time, with color tied to health state."
        aside={
          <div className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">
            {snapshot?.overallStatus ?? "unknown"}
          </div>
        }
      >
        {serviceLatencyData.length > 0 ? (
          <>
            <ChartContainer
              config={opsHealthLatencyConfig}
              className="min-h-[240px] w-full"
            >
              {showLatencyPieChart ? (
                <PieChart accessibilityLayer margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <ChartTooltip content={<ChartTooltipContent nameKey="service" />} />
                  <Pie
                    data={serviceLatencyData}
                    dataKey="latency"
                    nameKey="service"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {serviceLatencyData.map((entry) => (
                      <Cell key={entry.service} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <BarChart
                  accessibilityLayer
                  data={serviceLatencyData}
                  margin={{ top: 8, right: 12, left: 6 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="service"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="latency" radius={10}>
                    {serviceLatencyData.map((entry) => (
                      <Cell key={entry.service} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-sm text-gray-700">
              {stats.down > 0
                ? `${stats.down} service requires immediate response. Use the incident feed below to identify the failing dependency.`
                : stats.degraded > 0
                  ? `${stats.degraded} service is degraded. Investigate latency before it becomes a full outage.`
                  : "All monitored services are healthy right now, with no active runtime degradations detected."}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Health telemetry will render here once the platform starts reporting
            service checks.
          </p>
        )}
      </DashboardChartCard>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">
          Service Status
        </h2>
        <div className="mt-3">
          <DataTable
            columns={opsHealthColumns}
            data={services}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => row.name}
            searchColumnId="name"
            searchPlaceholder="Search services…"
            initialSorting={[{ id: "name", desc: false }]}
            initialPageSize={10}
            enablePagination={false}
            emptyState="No services are currently reporting health metrics."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">
          Incident Feed
        </h2>
        {snapshot &&
        snapshot.services.some((service) => service.status !== "healthy") ? (
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {snapshot.services
              .filter((service) => service.status !== "healthy")
              .map((service) => (
                <li
                  key={service.name}
                  className="rounded-lg border border-warning-100 bg-warning-50 p-3"
                >
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
