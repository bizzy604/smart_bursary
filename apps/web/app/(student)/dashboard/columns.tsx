"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/application/status-badge";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import {
	arrayIncludesFilterFn,
	dateRangeFilterFn,
	numberRangeFilterFn,
} from "@/components/shared/data-table-column-filter";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import type { StudentApplicationSummary } from "@/lib/student-types";

export type StudentApplicationRowAction = "withdraw" | "delete-draft";

export interface BuildStudentApplicationColumnsOptions {
	onAction?: (
		application: StudentApplicationSummary,
		action: StudentApplicationRowAction,
	) => void;
}

const WITHDRAWABLE_STATUSES: ReadonlyArray<StudentApplicationSummary["status"]> = [
	"SUBMITTED",
	"WARD_REVIEW",
	"COUNTY_REVIEW",
	"WAITLISTED",
];

export function buildStudentApplicationColumns(
	options: BuildStudentApplicationColumnsOptions = {},
): ColumnDef<StudentApplicationSummary>[] {
	const { onAction } = options;
	return [
	{
		accessorKey: "reference",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Reference"
				filter={{ type: "text", placeholder: "Search reference" }}
			/>
		),
		cell: ({ row }) => (
			<span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
				{row.original.reference}
			</span>
		),
		filterFn: "includesString",
	},
	{
		accessorKey: "programName",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Program"
				filter={{ type: "text", placeholder: "Search program" }}
			/>
		),
		cell: ({ row }) => (
			<span className="font-medium text-foreground">{row.original.programName}</span>
		),
		filterFn: "includesString",
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Status"
				filter={{ type: "multiselect", options: studentApplicationStatusOptions }}
			/>
		),
		cell: ({ row }) => <StatusBadge status={row.original.status} />,
		filterFn: arrayIncludesFilterFn,
	},
	{
		accessorKey: "requestedKes",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Requested"
				align="end"
				filter={{ type: "number", suffix: "KES", step: 1000 }}
			/>
		),
		cell: ({ row }) => (
			<div className="text-right font-medium tabular-nums">
				{formatCurrencyKes(row.original.requestedKes)}
			</div>
		),
		filterFn: numberRangeFilterFn,
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Updated"
				filter={{ type: "dateRange" }}
			/>
		),
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">{formatShortDate(row.original.updatedAt)}</span>
		),
		filterFn: dateRangeFilterFn,
	},
	{
		id: "actions",
		header: () => <span className="sr-only">Actions</span>,
		cell: ({ row }) => {
			const application = row.original;
			const canWithdraw = WITHDRAWABLE_STATUSES.includes(application.status);
			const canDeleteDraft = application.status === "DRAFT";
			return (
				<div className="flex items-center justify-end gap-2">
					{application.status === "DRAFT" ? (
						<Button asChild size="sm">
							<Link href={`/apply/${application.programId}`}>Continue Draft</Link>
						</Button>
					) : (
						<Button asChild variant="outline" size="sm">
							<Link href={`/applications/${application.id}`}>View</Link>
						</Button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" aria-label="Row actions">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link href={`/applications/${application.id}`}>View details</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href={`/applications/${application.id}/pdf`}>Download PDF</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => navigator.clipboard.writeText(application.reference)}
							>
								Copy reference
							</DropdownMenuItem>
							{onAction && canWithdraw ? (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => onAction(application, "withdraw")}
									>
										Withdraw application
									</DropdownMenuItem>
								</>
							) : null}
							{onAction && canDeleteDraft ? (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => onAction(application, "delete-draft")}
									>
										Delete draft
									</DropdownMenuItem>
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];
}

export const studentApplicationColumns = buildStudentApplicationColumns();

export const studentApplicationStatusOptions = [
	{ label: "Draft", value: "DRAFT" },
	{ label: "Submitted", value: "SUBMITTED" },
	{ label: "Ward Review", value: "WARD_REVIEW" },
	{ label: "County Review", value: "COUNTY_REVIEW" },
	{ label: "Approved", value: "APPROVED" },
	{ label: "Rejected", value: "REJECTED" },
	{ label: "Waitlisted", value: "WAITLISTED" },
	{ label: "Disbursed", value: "DISBURSED" },
];

