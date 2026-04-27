"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { FileText } from "lucide-react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/shared/data-table";
import { DataTableCsvExportButton } from "@/components/shared/data-table-csv-export-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useApplication } from "@/hooks/use-application";
import { type SpreadsheetColumn } from "@/lib/csv-export";
import {
	deleteStudentDraftApplication,
	withdrawStudentApplication,
} from "@/lib/student-api";
import type { StudentApplicationSummary } from "@/lib/student-types";
import {
	buildStudentApplicationColumns,
	type StudentApplicationRowAction,
} from "../dashboard/columns";

const STUDENT_APPLICATION_CSV_COLUMNS: SpreadsheetColumn<StudentApplicationSummary>[] = [
  { header: "Reference", value: (row) => row.reference, width: 20 },
  { header: "Program", value: (row) => row.programName, width: 32 },
  { header: "Status", value: (row) => row.status, width: 16 },
  { header: "Requested (KES)", value: (row) => row.requestedKes, type: "currency", width: 18 },
  { header: "Submitted At", value: (row) => row.submittedAt, type: "date", width: 14 },
  { header: "Updated At", value: (row) => row.updatedAt, type: "date", width: 14 },
];

interface PendingAction {
	type: StudentApplicationRowAction;
	application: StudentApplicationSummary;
}

export default function ApplicationsPage() {
	const { applications, isLoading, error, refresh } = useApplication();
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
	const [isMutating, setIsMutating] = useState(false);

	const handleAction = useCallback(
		(application: StudentApplicationSummary, action: StudentApplicationRowAction) => {
			setPendingAction({ type: action, application });
		},
		[],
	);

	const columns = useMemo(
		() => buildStudentApplicationColumns({ onAction: handleAction }),
		[handleAction],
	);

	const onConfirm = useCallback(async () => {
		if (!pendingAction) return;
		const { type, application } = pendingAction;
		setIsMutating(true);
		try {
			if (type === "withdraw") {
				await withdrawStudentApplication(application.id);
				toast.success("Application withdrawn", {
					description: `${application.programName} has been withdrawn from review.`,
				});
			} else {
				await deleteStudentDraftApplication(application.id);
				toast.success("Draft deleted", {
					description: `Your draft for ${application.programName} has been removed.`,
				});
			}
			setPendingAction(null);
			await refresh();
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : "Action failed.";
			toast.error(
				type === "withdraw" ? "Withdraw failed" : "Delete failed",
				{ description: message },
			);
		} finally {
			setIsMutating(false);
		}
	}, [pendingAction, refresh]);

	const dialogConfig = pendingAction
		? pendingAction.type === "withdraw"
			? {
					title: "Withdraw application?",
					description: `${pendingAction.application.programName} will be marked as withdrawn and will no longer progress through review. You can re-apply only if a new program is opened.`,
					confirmLabel: "Withdraw",
					destructive: false,
				}
			: {
					title: "Delete draft?",
					description: `${pendingAction.application.programName}: This draft will be removed from your applications. This action cannot be undone.`,
					confirmLabel: "Delete draft",
					destructive: true,
				}
		: null;

	return (
		<main className="space-y-5">
			<PageHeader
				eyebrow="My applications"
				title="Application timeline"
				description="Review status, open details, and download your submitted bursary forms."
				icon={FileText}
			/>

			{applications.length === 0 && !isLoading ? (
				<EmptyState
					tone="brand"
					icon={FileText}
					title="No applications yet"
					description="You haven't started a bursary application. Browse open programs to begin."
					action={
						<Link href="/programs">
							<Button>Find Open Programs</Button>
						</Link>
					}
				/>
			) : (
				<section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
					<DataTable
						columns={columns}
						data={applications}
						isLoading={isLoading}
						error={error}
						getRowId={(row) => row.id}
						searchColumnId="programName"
						searchPlaceholder="Search applications…"
						initialSorting={[{ id: "updatedAt", desc: true }]}
						emptyState="No applications match your filters."
						renderSelectedActions={({ selectedRows }) => (
							<DataTableCsvExportButton
								selectedRows={selectedRows}
								columns={STUDENT_APPLICATION_CSV_COLUMNS}
								filenamePrefix="my-applications"
								itemNoun="application"
							/>
						)}
					/>
				</section>
			)}

			<AlertDialog
				open={pendingAction !== null}
				onOpenChange={(open) => {
					if (!open && !isMutating) {
						setPendingAction(null);
					}
				}}
			>
				<AlertDialogContent>
					{dialogConfig ? (
						<>
							<AlertDialogHeader>
								<AlertDialogTitle>{dialogConfig.title}</AlertDialogTitle>
								<AlertDialogDescription>{dialogConfig.description}</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
								<AlertDialogAction
									disabled={isMutating}
									onClick={(event) => {
										event.preventDefault();
										void onConfirm();
									}}
									className={
										dialogConfig.destructive
											? "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40"
											: undefined
									}
								>
									{isMutating ? "Working…" : dialogConfig.confirmLabel}
								</AlertDialogAction>
							</AlertDialogFooter>
						</>
					) : null}
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
