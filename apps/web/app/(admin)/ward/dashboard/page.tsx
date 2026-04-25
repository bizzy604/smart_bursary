"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
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
import { CheckCircle2, ClipboardCheck, Clock, Wallet, XCircle } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrencyKes } from "@/lib/format";
import { fetchWardSummaryReport } from "@/lib/reporting-api";
import { fetchWorkflowQueueByStatus } from "@/lib/review-workflow-api";
import type { ReviewQueueItem } from "@/lib/review-types";

const wardPriorityConfig = {
  applications: {
    label: "Applications",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const wardEducationMixConfig = {
  applications: {
    label: "Applications",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function WardDashboardPage() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [allRows, setAllRows] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [wardQueue, report] = await Promise.all([
          fetchWorkflowQueueByStatus("WARD_REVIEW"),
          fetchWardSummaryReport({}),
        ]);

        if (!mounted) {
          return;
        }

        setQueue(wardQueue);
        setAllRows(
          report.rows.map((row) => ({
            applicationId: row.applicationId,
            reference: row.reference,
            applicantName: row.applicantName,
            wardName: row.wardName,
            programName: row.programName,
            academicYear: row.academicYear,
            educationLevel: row.educationLevel,
            status: row.status as ReviewQueueItem["status"],
            aiScore: row.aiScore,
            wardRecommendationKes: row.wardRecommendationKes,
            countyAllocationKes: row.countyAllocationKes,
            reviewerName: row.reviewerName,
            reviewerStage: row.reviewerStage,
            reviewedAt: row.reviewedAt,
          })),
        );
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message =
          reason instanceof Error
            ? reason.message
            : "Failed to load ward dashboard.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const reviewedToday = allRows.filter((row) => {
      if (!row.reviewedAt) {
        return false;
      }
      return new Date(row.reviewedAt).toDateString() === today;
    }).length;

    return {
      pending: queue.length,
      reviewedToday,
      rejected: allRows.filter((row) => row.status === "REJECTED").length,
      recommendedKes: allRows.reduce(
        (sum, row) => sum + row.wardRecommendationKes,
        0,
      ),
    };
  }, [allRows, queue]);

  const educationLevelOptions = useMemo(() => {
    const values = Array.from(
      new Set(queue.map((item) => item.educationLevel)),
    ).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const programOptions = useMemo(() => {
    const values = Array.from(
      new Set(queue.map((item) => item.programName)),
    ).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [queue]);

  const wardQueueColumns = useMemo(
    () =>
      buildReviewQueueColumns({
        columns: [
          "reference",
          "applicantName",
          "programName",
          "educationLevel",
          "aiScore",
          "status",
          "reviewedAt",
        ],
        primaryAction: {
          label: "Review",
          href: (item) => `/ward/applications/${item.applicationId}` as Route,
        },
        menuActions: [
          {
            label: "View Documents",
            href: (item) =>
              `/ward/applications/${item.applicationId}/documents` as Route,
          },
          {
            label: "AI Score",
            href: (item) =>
              `/ward/applications/${item.applicationId}/score` as Route,
          },
        ],
        programOptions,
        educationLevelOptions,
      }),
    [programOptions, educationLevelOptions],
  );
  const priorityBandData = useMemo(
    () => [
      {
        band: "Critical",
        applications: queue.filter((item) => item.aiScore >= 85).length,
        fill: "var(--chart-4)",
      },
      {
        band: "High",
        applications: queue.filter(
          (item) => item.aiScore >= 70 && item.aiScore < 85,
        ).length,
        fill: "var(--chart-2)",
      },
      {
        band: "Steady",
        applications: queue.filter(
          (item) => item.aiScore >= 55 && item.aiScore < 70,
        ).length,
        fill: "var(--chart-1)",
      },
      {
        band: "Manual",
        applications: queue.filter((item) => item.aiScore < 55).length,
        fill: "var(--chart-5)",
      },
    ],
    [queue],
  );
  const educationMixData = useMemo(
    () =>
      Array.from(
        queue.reduce((map, item) => {
          const key = item.educationLevel || "Unspecified";
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
      )
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([educationLevel, applications], index) => ({
          educationLevel,
          applications,
          fill: dashboardChartColor(index),
        })),
    [queue],
  );
  const criticalQueueCount = priorityBandData[0]?.applications ?? 0;
  const showPriorityPieChart = shouldUsePieChart(priorityBandData.length);

  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="Ward dashboard"
        title="Application Review Command Center"
        description="Applications are ranked by AI score to help committee members prioritize high-need cases quickly."
        icon={ClipboardCheck}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Pending Review"
          value={String(stats.pending)}
          hint="Waiting in ward queue"
          icon={Clock}
          intent="warning"
        />
        <StatsCard
          label="Reviewed Today"
          value={String(stats.reviewedToday)}
          hint="Committee decisions logged"
          icon={CheckCircle2}
          intent="success"
        />
        <StatsCard
          label="Rejected"
          value={String(stats.rejected)}
          hint="This cycle so far"
          icon={XCircle}
          intent="danger"
        />
        <StatsCard
          label="Recommended Amount"
          value={formatCurrencyKes(stats.recommendedKes)}
          hint="Total proposed to county"
          icon={Wallet}
          intent="brand"
        />
      </section>

      {error ? (
        <section className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardChartCard
          eyebrow="Queue Pressure"
          title="Review workload by AI priority band"
          description="Use urgency bands to assign attention before the committee queue starts to bottleneck."
          aside={
            <div className="rounded-full border border-warning-100 bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700">
              {queue.length} awaiting review
            </div>
          }
        >
          {queue.length > 0 ? (
            <>
              <ChartContainer
                config={wardPriorityConfig}
                className="min-h-[240px] w-full"
              >
                {showPriorityPieChart ? (
                  <PieChart accessibilityLayer margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <ChartTooltip content={<ChartTooltipContent nameKey="band" />} />
                    <Pie
                      data={priorityBandData}
                      dataKey="applications"
                      nameKey="band"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {priorityBandData.map((entry) => (
                        <Cell key={entry.band} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    accessibilityLayer
                    data={priorityBandData}
                    margin={{ top: 8, right: 8, left: -16 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="band"
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
                    <Bar dataKey="applications" radius={10}>
                      {priorityBandData.map((entry) => (
                        <Cell key={entry.band} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-sm text-gray-700">
                {criticalQueueCount > 0 ? (
                  <>
                    <span className="font-semibold text-brand-900">
                      {criticalQueueCount}
                    </span>{" "}
                    high-need application
                    {criticalQueueCount === 1 ? " sits" : "s sit"} in the
                    critical band and should lead the next review pass.
                  </>
                ) : (
                  "No critical-band applications at the moment. The queue is leaning toward routine review work."
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              The ward queue is currently clear. Priority distribution will
              appear as soon as new applications arrive.
            </p>
          )}
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow="Applicant Mix"
          title="Queue composition by education level"
          description="This helps ward teams balance secondary, TVET, and university reviews during each sitting."
          aside={
            <div className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">
              {educationMixData.length} level groups
            </div>
          }
        >
          {educationMixData.length > 0 ? (
            <>
              <ChartContainer
                config={wardEducationMixConfig}
                className="min-h-[240px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={educationMixData}
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
                    dataKey="educationLevel"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={130}
                    tickFormatter={(value) =>
                      compactChartLabel(String(value), 16)
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="applications" radius={10}>
                    {educationMixData.map((entry) => (
                      <Cell key={entry.educationLevel} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-3 text-sm text-gray-700">
                Recommended amount in the current ward pipeline totals{" "}
                <span className="font-semibold text-brand-900">
                  {formatCurrencyKes(stats.recommendedKes)}
                </span>
                , giving the committee an early signal on what it may escalate
                to county review.
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              No queued applications yet. Education-level mix will render here
              once students enter ward review.
            </p>
          )}
        </DashboardChartCard>
      </section>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-brand-900">
              Top Priority Applications
            </h2>
            <p className="text-sm text-gray-600">
              Sorted by AI score from highest need to lowest.
            </p>
          </div>
          <Link href="/ward/applications">
            <Button variant="outline" size="sm">
              Open Full Queue
            </Button>
          </Link>
        </div>

        <div className="mt-3">
          <DataTable
            columns={wardQueueColumns}
            data={queue}
            isLoading={isLoading}
            getRowId={(row) => row.applicationId}
            searchColumnId="applicantName"
            searchPlaceholder="Search applications…"
            initialSorting={[{ id: "aiScore", desc: true }]}
            initialPageSize={10}
            emptyState="No applications are currently waiting in the ward queue."
          />
        </div>
      </section>
    </main>
  );
}
