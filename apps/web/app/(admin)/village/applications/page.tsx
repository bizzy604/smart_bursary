"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { buildReviewQueueColumns } from "@/components/shared/review-queue-columns";
import type { ReviewQueueItem } from "@/lib/review-types";

export default function VillageApplicationsPage() {
	const [applications, setApplications] = useState<ReviewQueueItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadApplications = async () => {
			setIsLoading(true);
			try {
				// TODO: Replace with village-specific API when available
				// For now, using placeholder empty data
				const villageApps: ReviewQueueItem[] = [];

				if (!mounted) {
					return;
				}

				setApplications(villageApps);
				setError(null);
			} catch (reason: unknown) {
				if (!mounted) {
					return;
				}

				const message =
					reason instanceof Error
						? reason.message
						: "Failed to load village applications.";
				setError(message);
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		};

		void loadApplications();

		return () => {
			mounted = false;
		};
	}, []);

	const educationLevelOptions = useMemo(() => {
		const values = Array.from(
			new Set(applications.map((item) => item.educationLevel)),
		).filter(Boolean);
		return values.map((value) => ({ label: value, value }));
	}, [applications]);

	const programOptions = useMemo(() => {
		const values = Array.from(
			new Set(applications.map((item) => item.programName)),
		).filter(Boolean);
		return values.map((value) => ({ label: value, value }));
	}, [applications]);

	const columns = useMemo(
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

	return (
		<main className="space-y-5">
			<PageHeader
				eyebrow="Village administration"
				title="Applications"
				description="View and manage all applications within your assigned village units."
			/>

			{error ? (
				<section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{error}
				</section>
			) : null}

			{isLoading ? (
				<div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
					Loading applications...
				</div>
			) : applications.length === 0 ? (
				<div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
					No applications found in your village units.
				</div>
			) : (
				<DataTable columns={columns} data={applications} />
			)}
		</main>
	);
}
