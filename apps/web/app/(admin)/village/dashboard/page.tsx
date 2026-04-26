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
import type { ReviewQueueItem } from "@/lib/review-types";

const villagePriorityConfig = {
	applications: {
		label: "Applications",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

const villageEducationMixConfig = {
	applications: {
		label: "Applications",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export default function VillageDashboardPage() {
	const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
	const [allRows, setAllRows] = useState<ReviewQueueItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadDashboard = async () => {
			setIsLoading(true);
			try {
				// TODO: Replace with village-specific API when available
				// For now, using placeholder empty data
				const villageQueue: ReviewQueueItem[] = [];
				const reportRows: ReviewQueueItem[] = [];

				if (!mounted) {
					return;
				}

				setQueue(villageQueue);
				setAllRows(reportRows);
				setError(null);
			} catch (reason: unknown) {
				if (!mounted) {
					return;
				}

				const message =
					reason instanceof Error
						? reason.message
						: "Failed to load village dashboard.";
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
				(sum, row) => sum + (row.wardRecommendationKes || 0),
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

	const villageQueueColumns = useMemo(
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
					href: (item) => `/village/applications/${item.applicationId}` as Route,
				},
				menuActions: [
					{
						label: "View Documents",
						href: (item) =>
							`/village/applications/${item.applicationId}/documents` as Route,
					},
					{
						label: "AI Score",
						href: (item) =>
							`/village/applications/${item.applicationId}/score` as Route,
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
				eyebrow="Village dashboard"
				title="Application Review Command Center"
				description="Applications are ranked by AI score to help committee members prioritize high-need cases quickly."
				icon={ClipboardCheck}
			/>

			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatsCard
					label="Pending Review"
					value={String(stats.pending)}
					hint="Waiting in village queue"
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
				<section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{error}
				</section>
			) : null}

			<section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
				<DashboardChartCard
					eyebrow="Queue Pressure"
					title="Review workload by AI priority band"
					description="Use urgency bands to assign attention before the committee queue starts to bottleneck."
					aside={
						<div className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
							{queue.length} awaiting review
						</div>
					}
				>
					{queue.length > 0 ? (
						<>
							<ChartContainer
								config={villagePriorityConfig}
								className="min-h-[240px] w-full"
							>
								{showPriorityPieChart ? (
									<PieChart accessibilityLayer margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
										<ChartTooltip content={<ChartTooltipContent nameKey="band" />} />
										<Pie
											data={priorityBandData}
											dataKey="applications"
											nameKey="band"
											innerRadius={48}
											strokeWidth={2}
										>
											{priorityBandData.map((entry, index) => (
												<Cell key={entry.band} fill={entry.fill} />
											))}
										</Pie>
									</PieChart>
								) : (
									<BarChart accessibilityLayer data={priorityBandData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
										<XAxis dataKey="band" tickLine={false} tickMargin={8} radius={4} />
										<YAxis tickLine={false} tickMargin={8} radius={4} />
										<CartesianGrid vertical={false} />
										<ChartTooltip content={<ChartTooltipContent nameKey="band" />} />
										<Bar dataKey="applications" radius={4} />
									</BarChart>
								)}
							</ChartContainer>
						</>
					) : (
						<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
							No applications in queue
						</div>
					)}
				</DashboardChartCard>

				<DashboardChartCard
					eyebrow="Education Mix"
					title="Applications by education level"
					description="Understanding the education distribution helps tailor outreach and support."
				>
					{educationMixData.length > 0 ? (
						<ChartContainer
							config={villageEducationMixConfig}
							className="min-h-[240px] w-full"
						>
							<BarChart
								accessibilityLayer
								data={educationMixData}
								margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
							>
								<XAxis
									dataKey="educationLevel"
									tickLine={false}
									tickMargin={8}
									radius={4}
									tickFormatter={(value) => compactChartLabel(value)}
								/>
								<YAxis tickLine={false} tickMargin={8} radius={4} />
								<CartesianGrid vertical={false} />
								<ChartTooltip content={<ChartTooltipContent nameKey="educationLevel" />} />
								<Bar dataKey="applications" radius={4}>
									{educationMixData.map((entry, index) => (
										<Cell key={entry.educationLevel} fill={entry.fill} />
									))}
								</Bar>
							</BarChart>
						</ChartContainer>
					) : (
						<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
							No applications to display
						</div>
					)}
				</DashboardChartCard>
			</section>

			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-lg font-semibold">Review Queue</h2>
					{criticalQueueCount > 0 && (
						<Link href="/village/review" as Route>
							<Button variant="outline" size="sm">
								View Full Queue
							</Button>
						</Link>
					)}
				</div>
				{isLoading ? (
					<div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
						Loading queue...
					</div>
				) : queue.length === 0 ? (
					<div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
						No applications in review queue.
					</div>
				) : (
					<DataTable columns={villageQueueColumns} data={queue} />
				)}
			</section>
		</main>
	);
}
