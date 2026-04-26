"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { buildReviewQueueColumns } from "@/components/shared/review-queue-columns";
import type { ReviewQueueItem } from "@/lib/review-types";

export default function VillageReviewPage() {
	const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const loadQueue = async () => {
			setIsLoading(true);
			try {
				// TODO: Replace with village-specific API when available
				// For now, using placeholder empty data
				const villageQueue: ReviewQueueItem[] = [];

				if (!mounted) {
					return;
				}

				setQueue(villageQueue);
				setError(null);
			} catch (reason: unknown) {
				if (!mounted) {
					return;
				}

				const message =
					reason instanceof Error
						? reason.message
						: "Failed to load village review queue.";
				setError(message);
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		};

		void loadQueue();

		return () => {
			mounted = false;
		};
	}, []);

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
				title="Review Queue"
				description="Applications pending village-level review and recommendation."
			/>

			{error ? (
				<section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
					{error}
				</section>
			) : null}

			{isLoading ? (
				<div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
					Loading queue...
				</div>
			) : queue.length === 0 ? (
				<div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
					No applications in review queue.
				</div>
			) : (
				<DataTable columns={columns} data={queue} />
			)}
		</main>
	);
}
