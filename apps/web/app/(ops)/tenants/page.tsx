"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import {
  compactChartLabel,
  dashboardChartColor,
  shouldUsePieChart,
} from "@/components/dashboard/chart-utils";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatsCard } from "@/components/shared/stats-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fetchOpsTenants, type OpsTenantSummary } from "@/lib/ops-api";
import {
  opsTenantColumns,
  opsTenantPlanOptions,
  opsTenantStatusOptions,
} from "./columns";

const opsTenantPlanConfig = {
  tenants: {
    label: "Tenants",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const opsTenantUsersConfig = {
  users: {
    label: "Users",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

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

        const message =
          reason instanceof Error
            ? reason.message
            : "Failed to load tenant registry.";
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
    const enterprise = tenants.filter(
      (tenant) => tenant.planTier === "ENTERPRISE",
    ).length;

    return {
      active,
      inactive,
      enterprise,
    };
  }, [tenants]);
  const planDistributionData = useMemo(
    () => [
      {
        tier: "Basic",
        tenants: tenants.filter((tenant) => tenant.planTier === "BASIC").length,
        fill: "var(--chart-5)",
      },
      {
        tier: "Standard",
        tenants: tenants.filter((tenant) => tenant.planTier === "STANDARD")
          .length,
        fill: "var(--chart-2)",
      },
      {
        tier: "Enterprise",
        tenants: tenants.filter((tenant) => tenant.planTier === "ENTERPRISE")
          .length,
        fill: "var(--chart-3)",
      },
    ],
    [tenants],
  );
  const tenantFootprintData = useMemo(
    () =>
      [...tenants]
        .sort((left, right) => right.userCount - left.userCount)
        .slice(0, 5)
        .map((tenant, index) => ({
          countyName: compactChartLabel(tenant.countyName, 18),
          fullName: tenant.countyName,
          users: tenant.userCount,
          wards: tenant.wardCount,
          fill: dashboardChartColor(index),
        })),
    [tenants],
  );
  const topTenant = tenantFootprintData[0] ?? null;
  const showPlanPieChart = shouldUsePieChart(planDistributionData.length);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">
          Tenant Registry
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor county tenants, subscription tiers, and onboarding posture
          from one operations console.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Active Tenants"
          value={String(stats.active)}
          hint="Counties currently enabled"
        />
        <StatsCard
          label="Inactive"
          value={String(stats.inactive)}
          hint="Suspended or disabled counties"
        />
        <StatsCard
          label="Enterprise"
          value={String(stats.enterprise)}
          hint="Top-tier subscriptions"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <DashboardChartCard
          eyebrow="Subscription Mix"
          title="Plan tier distribution"
          description="A quick view of how many counties sit in each commercial tier."
          aside={
            <div className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">
              {tenants.length} tenants
            </div>
          }
        >
          {tenants.length > 0 ? (
            <>
              <ChartContainer
                config={opsTenantPlanConfig}
                className="min-h-[220px] w-full"
              >
                {showPlanPieChart ? (
                  <PieChart accessibilityLayer margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <ChartTooltip content={<ChartTooltipContent nameKey="tier" />} />
                    <Pie
                      data={planDistributionData}
                      dataKey="tenants"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell key={`${entry.tier}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    accessibilityLayer
                    data={planDistributionData}
                    margin={{ top: 8, right: 8, left: -16 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="tier"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="tenants" radius={10}>
                      {planDistributionData.map((entry) => (
                        <Cell key={entry.tier} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-sm text-gray-700">
                Enterprise counties account for{" "}
                <span className="font-semibold text-brand-900">
                  {stats.enterprise}
                </span>{" "}
                of the currently provisioned tenants.
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              No tenant distribution is available yet.
            </p>
          )}
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow="Registry Footprint"
          title="Largest counties by active user base"
          description="Focus operations attention on the counties carrying the heaviest day-to-day usage."
          aside={
            <div className="rounded-full border border-accent-100 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
              Top 5 counties
            </div>
          }
        >
          {tenantFootprintData.length > 0 ? (
            <>
              <ChartContainer
                config={opsTenantUsersConfig}
                className="min-h-[220px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={tenantFootprintData}
                  layout="vertical"
                  margin={{ top: 8, right: 12, left: 24 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="countyName"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tickFormatter={(value) =>
                      compactChartLabel(String(value), 15)
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="users" radius={10}>
                    {tenantFootprintData.map((entry) => (
                      <Cell key={entry.fullName} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              {topTenant ? (
                <div className="rounded-xl border border-accent-100 bg-accent-50/70 p-3 text-sm text-gray-700">
                  <span className="font-semibold text-brand-900">
                    {topTenant.fullName}
                  </span>{" "}
                  currently has the widest operational footprint with{" "}
                  <span className="font-semibold">{topTenant.users}</span> users
                  across{" "}
                  <span className="font-semibold">{topTenant.wards}</span>{" "}
                  wards.
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Tenant footprint data will appear here once counties are
              provisioned.
            </p>
          )}
        </DashboardChartCard>
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
              {
                columnId: "planTier",
                title: "Plan",
                options: opsTenantPlanOptions,
              },
              {
                columnId: "status",
                title: "Status",
                options: opsTenantStatusOptions,
              },
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
