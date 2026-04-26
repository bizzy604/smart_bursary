"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { BudgetBar } from "@/components/application/budget-bar";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import {
  compactChartLabel,
  dashboardChartColor,
  shouldUsePieChart,
} from "@/components/dashboard/chart-utils";
import { DataTable } from "@/components/shared/data-table";
import {
  buildReviewQueueColumns,
} from "@/components/shared/review-queue-columns";
import { Banknote, CheckCircle2, Send, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrencyKes } from "@/lib/format";
import {
  fetchDashboardReport,
  type DashboardReportData,
} from "@/lib/reporting-api";
import { fetchWorkflowQueueByStatus } from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

const countyProgramUtilizationConfig = {
  utilization: {
    label: "Utilization",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const countyWardMixConfig = {
  applications: {
    label: "Applications",
    color: "var(--chart-2)",
  },
  approved: {
    label: "Approved",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export default function CountyDashboardPage() {
  const [dashboardData, setDashboardData] =
    useState<DashboardReportData | null>(null);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const [dashboard, countyQueue] = await Promise.all([
          fetchDashboardReport(),
          fetchWorkflowQueueByStatus("COUNTY_REVIEW"),
        ]);

        if (!mounted) {
          return;
        }

        setDashboardData(dashboard);
        setQueue(countyQueue);
        setDashboardError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message =
          reason instanceof Error
            ? reason.message
            : "Failed to refresh dashboard metrics.";
        setDashboardError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();
    const intervalId = window.setInterval(() => {
      void loadDashboard();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const stats = useMemo(
    () => ({
      approved: dashboardData?.approvedApplications ?? 0,
      allocatedKes:
        dashboardData?.programs.reduce(
          (sum, program) => sum + program.allocated_total,
          0,
        ) ?? 0,
      remainingKes:
        dashboardData?.programs.reduce(
          (sum, program) =>
            sum + (program.budget_ceiling - program.allocated_total),
          0,
        ) ?? 0,
      disbursed: dashboardData?.disbursedCount ?? 0,
    }),
    [dashboardData],
  );

  const budget = useMemo(() => {
    const primaryProgram = dashboardData?.programs[0];
    if (!primaryProgram) {
      return {
        programName: "County Bursary Programme",
        ceilingKes: 0,
        allocatedKes: 0,
        disbursedKes: 0,
      };
    }

    return {
      programName: primaryProgram.name,
      ceilingKes: primaryProgram.budget_ceiling,
      allocatedKes: primaryProgram.allocated_total,
      disbursedKes: primaryProgram.disbursed_total,
    };
  }, [dashboardData]);

  const wardFilterOptions = useMemo(() => {
    const values = Array.from(
      new Set(queue.map((item) => item.wardName)),
    ).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const programOptions = useMemo(() => {
    const values = Array.from(
      new Set(queue.map((item) => item.programName)),
    ).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const countyQueueColumns = useMemo(
    () =>
      buildReviewQueueColumns({
        columns: [
          "reference",
          "applicantName",
          "wardName",
          "programName",
          "aiScore",
          "wardRecommendationKes",
          "status",
          "reviewedAt",
        ],
        primaryAction: {
          label: "Final Review",
          href: (item) => `/county/review/${item.applicationId}` as Route,
        },
        menuActions: [
          {
            label: "View application",
            href: (item) =>
              `/county/applications/${item.applicationId}` as Route,
          },
        ],
        wardOptions: wardFilterOptions,
        programOptions,
      }),
    [wardFilterOptions, programOptions],
  );
  const programUtilizationData = useMemo(
    () =>
      (dashboardData?.programs ?? [])
        .map((program) => ({
          program: compactChartLabel(program.name, 18),
          fullName: program.name,
          utilization: Math.round(program.utilization_pct),
          allocatedKes: program.allocated_total,
          disbursedKes: program.disbursed_total,
        }))
        .sort((left, right) => right.utilization - left.utilization)
        .slice(0, 5)
        .map((program, index) => ({
          ...program,
          fill: dashboardChartColor(index),
        })),
    [dashboardData],
  );
  const wardActivityData = useMemo(
    () =>
      (dashboardData?.ward_breakdown ?? [])
        .map((row) => ({
          ward: compactChartLabel(row.ward_name, 16),
          wardName: row.ward_name,
          applications: row.applications,
          approved: row.approved,
          allocatedKes: row.allocated_kes,
        }))
        .sort((left, right) => right.applications - left.applications)
        .slice(0, 6),
    [dashboardData],
  );
  const busiestWard = wardActivityData[0] ?? null;
  const showUtilizationPieChart = shouldUsePieChart(programUtilizationData.length);

  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="County dashboard"
        title="Finance Officer Review Portal"
        description="Monitor county allocations, track review throughput, and push approved records to disbursement."
        icon={Banknote}
      />

      {dashboardError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {dashboardError}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Approved"
          value={String(stats.approved)}
          hint="Approved applications this cycle"
          icon={CheckCircle2}
          intent="success"
        />
        <StatsCard
          label="Allocated"
          value={formatCurrencyKes(stats.allocatedKes)}
          hint="Total allocated amount"
          icon={Wallet}
          intent="brand"
        />
        <StatsCard
          label="Remaining"
          value={formatCurrencyKes(stats.remainingKes)}
          hint="Budget still available"
          icon={Banknote}
          intent="warning"
        />
        <StatsCard
          label="Disbursed"
          value={String(stats.disbursed)}
          hint={isLoading ? "Refreshing..." : "Applications already paid"}
          icon={Send}
          intent="success"
        />
      </section>

      <BudgetBar
        programName={budget.programName}
        ceiling={budget.ceilingKes}
        allocated={budget.allocatedKes}
        disbursed={budget.disbursedKes}
      />

      <section className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <DashboardChartCard
          eyebrow="Program Momentum"
          title="Program utilization across county funds"
          description="Spot which bursary windows are closest to budget pressure before the next approval run."
          aside={
            <div className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-primary">
              {programUtilizationData.length} tracked
            </div>
          }
        >
          {programUtilizationData.length > 0 ? (
            <>
              <ChartContainer
                config={countyProgramUtilizationConfig}
                className="min-h-[250px] w-full"
              >
                {showUtilizationPieChart ? (
                  <PieChart accessibilityLayer margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <ChartTooltip content={<ChartTooltipContent nameKey="program" />} />
                    <Pie
                      data={programUtilizationData}
                      dataKey="utilization"
                      nameKey="program"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {programUtilizationData.map((entry, index) => (
                        <Cell key={`${entry.fullName}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    accessibilityLayer
                    data={programUtilizationData}
                    layout="vertical"
                    margin={{ top: 8, right: 12, left: 24 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                      dataKey="program"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={120}
                      tickFormatter={(value) =>
                        compactChartLabel(String(value), 15)
                      }
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="utilization" radius={10}>
                      {programUtilizationData.map((entry, index) => (
                        <Cell key={`${entry.fullName}-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
              <div className="rounded-xl border border-border bg-muted/80 p-3 text-sm text-foreground/90">
                Budget approvals currently total{" "}
                <span className="font-semibold text-primary">
                  {formatCurrencyKes(stats.allocatedKes)}
                </span>
                , leaving{" "}
                <span className="font-semibold text-primary">
                  {formatCurrencyKes(stats.remainingKes)}
                </span>{" "}
                still available for the remaining cycle.
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Program utilization will appear here once county program analytics
              are available.
            </p>
          )}
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow="Ward Activity"
          title="Where the county review load is coming from"
          description="Compare ward application volume with approvals to see where committee throughput is strongest."
          aside={
            <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {dashboardData?.ward_breakdown.length ?? 0} wards
            </div>
          }
        >
          {wardActivityData.length > 0 ? (
            <>
              <ChartContainer
                config={countyWardMixConfig}
                className="min-h-[250px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={wardActivityData}
                  margin={{ top: 12, right: 12, left: -10 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="ward"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) =>
                      compactChartLabel(String(value), 10)
                    }
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="applications"
                    fill="var(--color-applications)"
                    radius={8}
                  />
                  <Bar
                    dataKey="approved"
                    fill="var(--color-approved)"
                    radius={8}
                  />
                </BarChart>
              </ChartContainer>
              {busiestWard ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-foreground/90">
                  <span className="font-semibold text-primary">
                    {busiestWard.wardName}
                  </span>{" "}
                  is currently leading county activity with{" "}
                  <span className="font-semibold">
                    {busiestWard.applications}
                  </span>{" "}
                  applications and{" "}
                  <span className="font-semibold">
                    {formatCurrencyKes(busiestWard.allocatedKes)}
                  </span>{" "}
                  already allocated.
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ward-level volume trends will appear here once the county report
              includes ward activity.
            </p>
          )}
        </DashboardChartCard>
      </section>

      {dashboardData?.ward_breakdown?.length ? (
        <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
          <h2 className="font-serif text-xl font-semibold text-primary">
            Ward Breakdown
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-refreshes every 30 seconds.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Ward</th>
                  <th className="px-2 py-2">Applications</th>
                  <th className="px-2 py-2">Approved</th>
                  <th className="px-2 py-2">Allocated</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.ward_breakdown.map((row) => (
                  <tr key={row.ward_id} className="border-b border-border">
                    <td className="px-2 py-2 font-medium text-primary">
                      {row.ward_name}
                    </td>
                    <td className="px-2 py-2 text-foreground/90">
                      {row.applications}
                    </td>
                    <td className="px-2 py-2 text-foreground/90">{row.approved}</td>
                    <td className="px-2 py-2 text-foreground/90">
                      {formatCurrencyKes(row.allocated_kes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-primary">
              County Review Queue
            </h2>
            <p className="text-sm text-muted-foreground">
              Applications recommended by ward committees and awaiting final
              decision.
            </p>
          </div>
          <Link href="/county/review">
            <Button variant="outline" size="sm">
              Open Full Queue
            </Button>
          </Link>
        </div>

        <div className="mt-3">
          <DataTable
            columns={countyQueueColumns}
            data={queue}
            isLoading={isLoading}
            getRowId={(row) => row.applicationId}
            searchColumnId="applicantName"
            searchPlaceholder="Search applications…"
            initialSorting={[{ id: "aiScore", desc: true }]}
            initialPageSize={10}
            emptyState="No applications are currently waiting at county review stage."
            enableRowSelection={false}
          />
        </div>
      </section>
    </main>
  );
}
