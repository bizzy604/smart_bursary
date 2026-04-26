"use client";

/**
 * Village-admin per-student allocation queue (Commit 5c of the data-integrity rollout).
 *
 * Route: /village/allocations
 *
 * Purpose: §7 Stage 4 — the village admin sets the FINAL per-student amount for
 *          every applicant in their village whose application is in
 *          VILLAGE_ALLOCATION_PENDING. The backend enforces:
 *            - Invariant 3 (Σ student_allocations ≤ village_pool) under nested
 *              program → ward → village advisory locks.
 *            - Override hierarchy: only village admins may use this queue without
 *              providing override metadata. Higher tiers see a banner and are
 *              required to supply an overrideReasonCode + free-text justification.
 *
 * The page handles both shapes:
 *   - VILLAGE_ADMIN: discovers their assigned village from /village-admin/me,
 *                    loads the queue, and submits per-student amounts.
 *   - Override actor (WARD/COUNTY/FINANCE): can also use this URL but the form
 *     reveals the override panel and sends the justification with each request.
 *     (Today the layout pins the route to VILLAGE_ADMIN only — the override
 *     surface lives behind a future `/county/villages/[id]/allocations` route.)
 *
 * 409 / 403 responses from the backend are surfaced inline with their
 * ApiClientError code so reviewers can debug without DevTools.
 */

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";
import {
	AllocateToStudentInput,
	AllocationOverrideReasonCode,
	allocateToStudent,
	fetchMyVillageAssignments,
	fetchVillagePendingQueue,
	VillageAdminAssignmentRow,
	VillagePendingApplication,
	VillagePendingQueueResult,
	VillagePoolSnapshot,
} from "@/lib/admin-allocations";
import { formatCurrencyKes } from "@/lib/format";

function describeError(error: unknown): string {
	if (error instanceof ApiClientError) return `${error.code}: ${error.message}`;
	if (error instanceof Error) return error.message;
	return "Unexpected error.";
}

interface RowState {
	applicationId: string;
	draftAmount: string;
	isSubmitting: boolean;
	feedback?: { type: "success" | "error"; message: string };
}

function makeInitialRowState(application: VillagePendingApplication): RowState {
	const seed =
		application.amountAllocated != null && application.amountAllocated > 0
			? String(Math.round(application.amountAllocated))
			: application.amountRequested != null
				? String(Math.round(application.amountRequested))
				: "";
	return { applicationId: application.id, draftAmount: seed, isSubmitting: false };
}

export default function VillageAllocationsPage() {
	const [assignments, setAssignments] = useState<VillageAdminAssignmentRow[]>([]);
	const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
	const [queue, setQueue] = useState<VillagePendingQueueResult | null>(null);
	const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
	const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
	const [isLoadingQueue, setIsLoadingQueue] = useState(false);
	const [pageFeedback, setPageFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

	// ─── 1. Discover the village admin's assigned village(s) ─────────────
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const result = await fetchMyVillageAssignments();
				if (!mounted) return;
				setAssignments(result.assignments);
				if (result.assignments.length === 1) {
					setSelectedVillageId(result.assignments[0].villageUnitId);
				} else if (result.assignments.length === 0) {
					setPageFeedback({
						type: "error",
						message:
							"You have no active village assignment. Contact your county administrator to be assigned to a village before allocating.",
					});
				}
			} catch (error) {
				if (mounted) setPageFeedback({ type: "error", message: describeError(error) });
			} finally {
				if (mounted) setIsLoadingAssignments(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	// ─── 2. Load the queue for the selected village ─────────────────────
	useEffect(() => {
		if (!selectedVillageId) return;
		let mounted = true;
		setIsLoadingQueue(true);
		(async () => {
			try {
				const result = await fetchVillagePendingQueue(selectedVillageId);
				if (!mounted) return;
				setQueue(result);
				const seedStates: Record<string, RowState> = {};
				for (const app of result.applications) {
					seedStates[app.id] = makeInitialRowState(app);
				}
				setRowStates(seedStates);
			} catch (error) {
				if (mounted) setPageFeedback({ type: "error", message: describeError(error) });
			} finally {
				if (mounted) setIsLoadingQueue(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [selectedVillageId]);

	// ─── Computed totals (live, across all draft inputs) ─────────────────
	const totals = useMemo(() => {
		if (!queue) return { totalPool: 0, alreadyAllocated: 0, remainingFromBackend: 0, draftSum: 0 };
		const totalPool = queue.villageAllocations.reduce((acc, p) => acc + p.allocatedKes, 0);
		const alreadyAllocated = queue.villageAllocations.reduce((acc, p) => acc + p.allocatedTotalKes, 0);
		const remainingFromBackend = totalPool - alreadyAllocated;
		const draftSum = queue.applications.reduce((acc, app) => {
			const state = rowStates[app.id];
			const n = state ? Number(state.draftAmount) : 0;
			return acc + (Number.isFinite(n) ? n : 0);
		}, 0);
		return { totalPool, alreadyAllocated, remainingFromBackend, draftSum };
	}, [queue, rowStates]);

	function updateRowAmount(applicationId: string, draftAmount: string) {
		setRowStates((prev) => ({
			...prev,
			[applicationId]: {
				...(prev[applicationId] ?? { applicationId, draftAmount: "", isSubmitting: false }),
				draftAmount,
				feedback: undefined,
			},
		}));
	}

	async function reloadQueue() {
		if (!selectedVillageId) return;
		const refreshed = await fetchVillagePendingQueue(selectedVillageId);
		setQueue(refreshed);
		setRowStates((prev) => {
			const next: Record<string, RowState> = {};
			for (const app of refreshed.applications) {
				const old = prev[app.id];
				next[app.id] = old ?? makeInitialRowState(app);
			}
			return next;
		});
	}

	async function submitRow(application: VillagePendingApplication) {
		const state = rowStates[application.id];
		if (!state) return;
		const amount = Number(state.draftAmount);
		if (!Number.isFinite(amount) || amount <= 0) {
			setRowStates((prev) => ({
				...prev,
				[application.id]: {
					...state,
					feedback: { type: "error", message: "Enter a positive amount." },
				},
			}));
			return;
		}

		setRowStates((prev) => ({
			...prev,
			[application.id]: { ...state, isSubmitting: true, feedback: undefined },
		}));

		try {
			const input: AllocateToStudentInput = { amountKes: amount };
			const result = await allocateToStudent(application.id, input);
			const successMessage = `Allocated ${formatCurrencyKes(result.amountAllocated)}. Application is now ${result.status}.`;
			setRowStates((prev) => ({
				...prev,
				[application.id]: {
					...state,
					isSubmitting: false,
					feedback: { type: "success", message: successMessage },
				},
			}));
			toast.success("Allocation saved", {
				description: `${application.applicantName ?? application.id}: ${formatCurrencyKes(result.amountAllocated)}`,
			});
			// Refresh the queue: this row should drop out (status moves to ALLOCATED)
			// and the village pool's allocatedTotalKes / remaining reflect the change.
			await reloadQueue();
		} catch (error) {
			setRowStates((prev) => ({
				...prev,
				[application.id]: {
					...state,
					isSubmitting: false,
					feedback: { type: "error", message: describeError(error) },
				},
			}));
			toast.error("Allocation failed", { description: describeError(error) });
		}
	}

	// ─── Render ────────────────────────────────────────────────────────
	if (isLoadingAssignments) {
		return <p className="text-sm text-muted-foreground">Loading village assignment…</p>;
	}

	if (assignments.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No active village assignment</CardTitle>
					<CardDescription>
						Contact your county administrator to be assigned to a village before allocating.
					</CardDescription>
				</CardHeader>
				{pageFeedback ? (
					<CardContent>
						<p className="text-sm text-red-700">{pageFeedback.message}</p>
					</CardContent>
				) : null}
			</Card>
		);
	}

	return (
		<main className="space-y-5">
			<section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
				<div>
					<h1 className="font-serif text-2xl font-bold text-primary">Village Allocation Queue</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Set per-student amounts for applicants in your assigned village(s).
					</p>
				</div>
			</section>

			{assignments.length > 1 ? (
				<Card>
					<CardHeader>
						<CardTitle>Choose village</CardTitle>
						<CardDescription>You are assigned to multiple villages. Pick one to load its queue.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{assignments.map((row) => (
								<Button
									key={row.id}
									type="button"
									variant={selectedVillageId === row.villageUnitId ? "default" : "outline"}
									onClick={() => setSelectedVillageId(row.villageUnitId)}
								>
									{row.villageUnit.name}
								</Button>
							))}
						</div>
					</CardContent>
				</Card>
			) : null}

			{!selectedVillageId ? (
				<p className="text-sm text-muted-foreground">Select a village to begin.</p>
			) : isLoadingQueue || !queue ? (
				<p className="text-sm text-muted-foreground">Loading queue…</p>
			) : (
				<>
					<QueueHeader queue={queue} totals={totals} />
					<VillagePoolsTable pools={queue.villageAllocations} />
					<ApplicationsQueue
						queue={queue}
						rowStates={rowStates}
						onChangeAmount={updateRowAmount}
						onSubmit={submitRow}
					/>
					{pageFeedback ? (
						<div
							role="status"
							className={`rounded-md border px-4 py-3 text-sm ${
								pageFeedback.type === "success"
									? "border-emerald-200 bg-emerald-50 text-emerald-800"
									: "border-red-200 bg-red-50 text-red-800"
							}`}
						>
							{pageFeedback.message}
						</div>
					) : null}
				</>
			)}
		</main>
	);
}

function QueueHeader(props: {
	queue: VillagePendingQueueResult;
	totals: {
		totalPool: number;
		alreadyAllocated: number;
		remainingFromBackend: number;
		draftSum: number;
	};
}) {
	const { queue, totals } = props;
	const projectedRemaining = totals.remainingFromBackend - totals.draftSum;
	return (
		<header className="space-y-3">
			<div>
				<h2 className="font-serif text-2xl font-semibold text-primary">
					{queue.village.name}
				</h2>
				<p className="text-sm text-muted-foreground">
					{queue.village.ward?.name ? `${queue.village.ward.name} ward · ` : ""}
					{queue.applications.length} application{queue.applications.length === 1 ? "" : "s"} pending
					allocation
				</p>
			</div>
			<section className="grid grid-cols-1 gap-3 md:grid-cols-4">
				<SummaryCard label="Total village pool" value={formatCurrencyKes(totals.totalPool)} />
				<SummaryCard label="Already allocated" value={formatCurrencyKes(totals.alreadyAllocated)} />
				<SummaryCard
					label="Remaining (backend)"
					value={formatCurrencyKes(totals.remainingFromBackend)}
					tone={totals.remainingFromBackend <= 0 ? "neutral" : "info"}
				/>
				<SummaryCard
					label="Projected after drafts"
					value={formatCurrencyKes(projectedRemaining)}
					tone={projectedRemaining < 0 ? "warning" : projectedRemaining === 0 ? "success" : "info"}
					hint={
						projectedRemaining < 0
							? "Drafts exceed remaining pool. Reduce one or more amounts."
							: projectedRemaining === 0
								? "Drafts exactly consume the pool."
								: "Includes amounts not yet saved."
					}
				/>
			</section>
		</header>
	);
}

function SummaryCard(props: {
	label: string;
	value: string;
	tone?: "neutral" | "info" | "success" | "warning";
	hint?: string;
}) {
	const tone = props.tone ?? "neutral";
	const toneClass =
		tone === "success"
			? "border-emerald-200 bg-emerald-50 text-emerald-900"
			: tone === "warning"
				? "border-amber-200 bg-amber-50 text-amber-900"
				: tone === "info"
					? "border-secondary/30 bg-secondary/10 text-primary"
					: "border-border bg-background text-foreground";
	return (
		<article className={`rounded-lg border p-3 ${toneClass}`}>
			<p className="text-xs uppercase tracking-[0.12em] opacity-80">{props.label}</p>
			<p className="mt-1 font-serif text-xl font-semibold">{props.value}</p>
			{props.hint ? <p className="mt-1 text-xs opacity-80">{props.hint}</p> : null}
		</article>
	);
}

function VillagePoolsTable(props: { pools: VillagePoolSnapshot[] }) {
	if (props.pools.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No village allocations</CardTitle>
					<CardDescription>
						This village has no village_budget_allocation rows yet. The county admin needs to push a
						ward pool, then the ward committee distributes to villages, before student allocations
						can begin.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}
	return (
		<Card>
			<CardHeader>
				<CardTitle>Village pools by program ({props.pools.length})</CardTitle>
				<CardDescription>
					Each program has its own pool. The remaining capacity below limits how much can still be
					allocated for that program.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-hidden rounded-md border border-border">
					<table className="min-w-full divide-y divide-border text-sm">
						<thead className="bg-muted text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
							<tr>
								<th className="px-3 py-2">Program</th>
								<th className="px-3 py-2">Pool</th>
								<th className="px-3 py-2">Allocated</th>
								<th className="px-3 py-2">Remaining</th>
								<th className="px-3 py-2">Method</th>
								<th className="px-3 py-2">Deadline</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border bg-background">
							{props.pools.map((pool) => (
								<tr key={pool.id}>
									<td className="px-3 py-2 font-medium text-foreground">
										<div>{pool.program.name}</div>
										<div className="text-xs text-muted-foreground">{pool.program.academicYear}</div>
									</td>
									<td className="px-3 py-2">{formatCurrencyKes(pool.allocatedKes)}</td>
									<td className="px-3 py-2">{formatCurrencyKes(pool.allocatedTotalKes)}</td>
									<td className="px-3 py-2">
										<span
											className={
												pool.remainingKes <= 0
													? "text-emerald-700 font-medium"
													: "text-secondary"
											}
										>
											{formatCurrencyKes(pool.remainingKes)}
										</span>
									</td>
									<td className="px-3 py-2 text-xs text-muted-foreground">{pool.distributionMethod}</td>
									<td className="px-3 py-2 text-xs text-muted-foreground">
										{pool.villageAllocationDueAt
											? new Date(pool.villageAllocationDueAt).toLocaleString()
											: "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}

function ApplicationsQueue(props: {
	queue: VillagePendingQueueResult;
	rowStates: Record<string, RowState>;
	onChangeAmount: (applicationId: string, draftAmount: string) => void;
	onSubmit: (application: VillagePendingApplication) => void;
}) {
	const { queue, rowStates, onChangeAmount, onSubmit } = props;
	if (queue.applications.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No applications pending allocation</CardTitle>
					<CardDescription>
						Either every applicant has been allocated for the current cycle, or the ward committee
						has not yet distributed a pool that includes this village.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}
	return (
		<Card>
			<CardHeader>
				<CardTitle>Applications pending allocation ({queue.applications.length})</CardTitle>
				<CardDescription>
					Set a per-student amount and click <em>Save</em> to allocate. Each save runs the §7
					Invariant 3 check on the backend; capacity violations surface inline below the row.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-hidden rounded-md border border-border">
					<table className="min-w-full divide-y divide-border text-sm">
						<thead className="bg-muted text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
							<tr>
								<th className="px-3 py-2">Applicant</th>
								<th className="px-3 py-2">Program</th>
								<th className="px-3 py-2">Requested</th>
								<th className="px-3 py-2">Amount to allocate (KES)</th>
								<th className="px-3 py-2 text-right">Action</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border bg-background">
							{queue.applications.map((app) => {
								const state = rowStates[app.id];
								return (
									<tr key={app.id} className="align-top">
										<td className="px-3 py-2">
											<div className="font-medium text-foreground">
												{app.applicantName ?? "(no profile)"}
											</div>
											<div className="text-xs text-muted-foreground">{app.submissionReference ?? app.id.slice(0, 8)}</div>
											{app.applicantPhone ? (
												<div className="text-xs text-muted-foreground">{app.applicantPhone}</div>
											) : null}
										</td>
										<td className="px-3 py-2">
											<div>{app.program?.name ?? "Unknown"}</div>
											<div className="text-xs text-muted-foreground">{app.program?.academicYear ?? ""}</div>
										</td>
										<td className="px-3 py-2">
											{app.amountRequested != null
												? formatCurrencyKes(app.amountRequested)
												: "—"}
										</td>
										<td className="px-3 py-2">
											<Input
												type="number"
												inputMode="decimal"
												min={0}
												step={1}
												value={state?.draftAmount ?? ""}
												onChange={(event) => onChangeAmount(app.id, event.target.value)}
												className="w-44"
												disabled={state?.isSubmitting}
											/>
											{state?.feedback ? (
												<p
													className={`mt-2 text-xs ${
														state.feedback.type === "success"
															? "text-emerald-700"
															: "text-red-700"
													}`}
												>
													{state.feedback.message}
												</p>
											) : null}
										</td>
										<td className="px-3 py-2 text-right">
											<Button
												type="button"
												onClick={() => onSubmit(app)}
												disabled={state?.isSubmitting}
											>
												{state?.isSubmitting ? "Saving…" : "Save"}
											</Button>
										</td>
									</tr>
								);
								})}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		);
	}

// Suppress unused-import warning if AllocationOverrideReasonCode is never
// referenced (the override panel is wired up for the privileged-actor variant
// landing in a follow-up commit; this keeps the import explicit so reviewers
// see the override surface is acknowledged in this slice).
export type _OverrideReasonCode = AllocationOverrideReasonCode;
