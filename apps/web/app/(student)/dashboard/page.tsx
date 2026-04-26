"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import {
  compactChartLabel,
  dashboardChartColor,
  shouldUsePieChart,
} from "@/components/dashboard/chart-utils";
import { ClipboardList, FileSearch, GraduationCap } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatCurrencyKes,
  formatPercent,
  formatShortDate,
} from "@/lib/format";
import { useApplication } from "@/hooks/use-application";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { studentApplicationColumns } from "./columns";

const studentJourneyConfig = {
  applications: {
    label: "Applications",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const studentProgramConfig = {
  utilization: {
    label: "Utilization",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { programs, applications, isLoading, error } = useApplication();
  const { profile } = useStudentProfile();
  const studentName =
    profile?.fullName && profile.fullName !== "Not provided"
      ? profile.fullName
      : "Student";
  const activePrograms = programs.length;
  const submittedApplications = applications.filter(
    (application) => application.status !== "DRAFT",
  ).length;
  const inReview = applications.filter((application) =>
    application.status.includes("REVIEW"),
  ).length;
  const applicationJourneyData = useMemo(
    () => [
      {
        stage: "Draft",
        applications: applications.filter(
          (application) => application.status === "DRAFT",
        ).length,
        fill: "var(--chart-5)",
      },
      {
        stage: "Submitted",
        applications: applications.filter(
          (application) => application.status === "SUBMITTED",
        ).length,
        fill: "var(--chart-2)",
      },
      {
        stage: "Review",
        applications: applications.filter((application) =>
          application.status.includes("REVIEW"),
        ).length,
        fill: "var(--chart-1)",
      },
      {
        stage: "Awarded",
        applications: applications.filter((application) =>
          ["APPROVED", "DISBURSED"].includes(application.status),
        ).length,
        fill: "var(--chart-3)",
      },
      {
        stage: "Unsuccessful",
        applications: applications.filter((application) =>
          ["REJECTED", "WAITLISTED"].includes(application.status),
        ).length,
        fill: "var(--chart-4)",
      },
    ],
    [applications],
  );
  const programUtilizationData = useMemo(
    () =>
      [...programs]
        .map((program) => {
          const utilization =
            program.budgetCeilingKes > 0
              ? (program.allocatedKes / program.budgetCeilingKes) * 100
              : 0;
          return {
            program: compactChartLabel(program.name, 18),
            fullName: program.name,
            utilization: Math.min(100, Math.round(utilization)),
            budget: program.budgetCeilingKes,
            allocated: program.allocatedKes,
          };
        })
        .sort((left, right) => right.utilization - left.utilization)
        .slice(0, 5)
        .map((program, index) => ({
          ...program,
          fill: dashboardChartColor(index),
        })),
    [programs],
  );
  const leadProgram = programUtilizationData[0] ?? null;
  const showJourneyPieChart = shouldUsePieChart(applicationJourneyData.length);

  return (
    <main className="space-y-6">
      <PageHeader
        tone="branded"
        eyebrow="Student dashboard"
        title={`Welcome back, ${studentName}`}
        description="Track your bursary journey, check open county programs, and review your application progress in one place."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          label="Open Programs"
          value={String(activePrograms)}
          hint="Currently accepting applications"
          icon={GraduationCap}
          intent="brand"
        />
        <StatsCard
          label="Submitted"
          value={String(submittedApplications)}
          hint="Applications sent for review"
          icon={ClipboardList}
          intent="success"
        />
        <StatsCard
          label="In Review"
          value={String(inReview)}
          hint="Ward or county committee stage"
          icon={FileSearch}
          intent="warning"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardChartCard
          eyebrow="Application Flow"
          title="Your application journey at a glance"
          description="See how your drafts, submissions, and review outcomes are distributed right now."
          aside={
            <div className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-primary">
              {applications.length} tracked
            </div>
          }
        >
          {applications.length > 0 ? (
            <>
              <ChartContainer
                config={studentJourneyConfig}
                className="min-h-[240px] w-full"
              >
                {showJourneyPieChart ? (
                  <PieChart accessibilityLayer margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <ChartTooltip content={<ChartTooltipContent nameKey="stage" />} />
                    <Pie
                      data={applicationJourneyData}
                      dataKey="applications"
                      nameKey="stage"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {applicationJourneyData.map((entry) => (
                        <Cell key={entry.stage} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    accessibilityLayer
                    data={applicationJourneyData}
                    margin={{ top: 8, right: 8, left: -16 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="stage"
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
                      {applicationJourneyData.map((entry) => (
                        <Cell key={entry.stage} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-county-primary">
                    Momentum
                  </p>
                  <p className="mt-2 text-sm text-foreground/90">
                    {submittedApplications > 0
                      ? `${submittedApplications} application${submittedApplications === 1 ? "" : "s"} already moved beyond draft.`
                      : "Your next milestone is to submit your first application."}
                  </p>
                </div>
                <div className="rounded-xl border border-accent/20 bg-accent/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    Current Focus
                  </p>
                  <p className="mt-2 text-sm text-foreground/90">
                    {inReview > 0
                      ? `${inReview} case${inReview === 1 ? "" : "s"} is actively being reviewed by ward or county teams.`
                      : "No active reviews yet. Submitted applications will appear here once committees start processing them."}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No application activity yet. Once you start a draft or submit a
              request, this chart will show your progress mix.
            </p>
          )}
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow="Program Budget Pulse"
          title="Open programs by funding utilization"
          description="Quickly spot which active funds are filling up fastest before you apply."
          aside={
            <div className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              {activePrograms} live funds
            </div>
          }
        >
          {programUtilizationData.length > 0 ? (
            <>
              <ChartContainer
                config={studentProgramConfig}
                className="min-h-[240px] w-full"
              >
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
                    width={110}
                    tickFormatter={(value) =>
                      compactChartLabel(String(value), 14)
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="utilization" radius={10}>
                      {programUtilizationData.map((entry, index) => (
                        <Cell key={`${entry.fullName}-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              {leadProgram ? (
                <div className="rounded-xl border border-border bg-muted/80 p-3 text-sm text-foreground/90">
                  <span className="font-semibold text-primary">
                    {leadProgram.fullName}
                  </span>{" "}
                  is currently the busiest open fund at{" "}
                  <span className="font-semibold text-accent">
                    {formatPercent(leadProgram.utilization)}
                  </span>{" "}
                  utilization, with{" "}
                  <span className="font-semibold">
                    {formatCurrencyKes(leadProgram.allocated)}
                  </span>{" "}
                  already allocated out of{" "}
                  <span className="font-semibold">
                    {formatCurrencyKes(leadProgram.budget)}
                  </span>
                  .
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No open programs are available yet. Funding utilization will
              appear here once county intakes are published.
            </p>
          )}
        </DashboardChartCard>
      </section>

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border bg-background p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold text-primary">
            Open Programs
          </h2>
          <Link href="/programs">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading programs...</p>
        ) : (
          programs.map((program) => {
            const utilization =
              (program.allocatedKes / program.budgetCeilingKes) * 100;

            return (
              <article
                key={program.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-primary">
                      {program.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {program.ward} • Closes{" "}
                      {formatShortDate(program.closesAt)}
                    </p>
                  </div>
                  <Link href={`/programs/${program.id}`}>
                    <Button size="sm">View Program</Button>
                  </Link>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatPercent(utilization)} allocated</span>
                    <span>
                      {formatCurrencyKes(program.budgetCeilingKes)} budget
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${Math.min(100, utilization)}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-background p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-primary">
              My Applications
            </h2>
            <p className="text-sm text-muted-foreground">
              Track status, download documents, and continue drafts.
            </p>
          </div>
          <Link href="/applications">
            <Button variant="ghost" size="sm">
              See all
            </Button>
          </Link>
        </div>

        {applications.length === 0 && !isLoading ? (
          <EmptyState
            title="No applications yet"
            description="Start with an open program to create your first bursary application."
            action={
              <Link href="/programs">
                <Button>Browse Programs</Button>
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={studentApplicationColumns}
            data={applications}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => row.id}
            searchColumnId="programName"
            searchPlaceholder="Search applications…"
            initialPageSize={5}
            initialSorting={[{ id: "updatedAt", desc: true }]}
            emptyState="No applications match your filters."
            enableRowSelection={false}
          />
        )}
      </section>
    </main>
  );
}
