"use client";

import Link from "next/link";
import type { Route } from "next";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/application/status-badge";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
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
import type { ReviewQueueItem } from "@/lib/review-types";

export type ReviewQueueColumnId =
	| "reference"
	| "applicantName"
	| "wardName"
	| "programName"
	| "educationLevel"
	| "aiScore"
	| "status"
	| "wardRecommendationKes"
	| "countyAllocationKes"
	| "reviewerName"
	| "reviewedAt";

interface RowAction {
	label: string;
	href?: (row: ReviewQueueItem) => Route;
	onClick?: (row: ReviewQueueItem) => void;
	variant?: "default" | "outline" | "ghost";
	primary?: boolean;
}

interface BuildColumnsOptions {
	columns: ReviewQueueColumnId[];
	primaryAction?: RowAction;
	menuActions?: RowAction[];
}

const reference: ColumnDef<ReviewQueueItem> = {
	id: "reference",
	accessorKey: "reference",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
	cell: ({ row }) => (
		<span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
			{row.original.reference}
		</span>
	),
};

const applicantName: ColumnDef<ReviewQueueItem> = {
	id: "applicantName",
	accessorKey: "applicantName",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Applicant" />,
	cell: ({ row }) => <span className="font-medium text-foreground">{row.original.applicantName}</span>,
};

const wardName: ColumnDef<ReviewQueueItem> = {
	id: "wardName",
	accessorKey: "wardName",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Ward" />,
	cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.wardName}</span>,
	filterFn: (row, _id, value: string[]) => value.includes(row.original.wardName),
};

const programName: ColumnDef<ReviewQueueItem> = {
	id: "programName",
	accessorKey: "programName",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
	cell: ({ row }) => <span className="text-sm">{row.original.programName}</span>,
};

const educationLevel: ColumnDef<ReviewQueueItem> = {
	id: "educationLevel",
	accessorKey: "educationLevel",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Level" />,
	cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.educationLevel}</span>,
	filterFn: (row, _id, value: string[]) => value.includes(row.original.educationLevel),
};

const aiScore: ColumnDef<ReviewQueueItem> = {
	id: "aiScore",
	accessorKey: "aiScore",
	header: ({ column }) => (
		<div className="text-right">
			<DataTableColumnHeader column={column} title="AI Score" />
		</div>
	),
	cell: ({ row }) => (
		<div className="text-right font-display text-sm font-semibold tabular-nums text-brand-900">
			{row.original.aiScore.toFixed(1)}
		</div>
	),
};

const status: ColumnDef<ReviewQueueItem> = {
	id: "status",
	accessorKey: "status",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
	cell: ({ row }) => <StatusBadge status={row.original.status} />,
	filterFn: (row, _id, value: string[]) => value.includes(row.original.status),
};

const wardRecommendationKes: ColumnDef<ReviewQueueItem> = {
	id: "wardRecommendationKes",
	accessorKey: "wardRecommendationKes",
	header: ({ column }) => (
		<div className="text-right">
			<DataTableColumnHeader column={column} title="Ward Rec." />
		</div>
	),
	cell: ({ row }) => (
		<div className="text-right tabular-nums">{formatCurrencyKes(row.original.wardRecommendationKes)}</div>
	),
};

const countyAllocationKes: ColumnDef<ReviewQueueItem> = {
	id: "countyAllocationKes",
	accessorKey: "countyAllocationKes",
	header: ({ column }) => (
		<div className="text-right">
			<DataTableColumnHeader column={column} title="Allocation" />
		</div>
	),
	cell: ({ row }) => (
		<div className="text-right font-medium tabular-nums">
			{formatCurrencyKes(row.original.countyAllocationKes)}
		</div>
	),
};

const reviewerName: ColumnDef<ReviewQueueItem> = {
	id: "reviewerName",
	accessorKey: "reviewerName",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewer" />,
	cell: ({ row }) => (
		<span className="text-sm text-muted-foreground">{row.original.reviewerName || "—"}</span>
	),
};

const reviewedAt: ColumnDef<ReviewQueueItem> = {
	id: "reviewedAt",
	accessorKey: "reviewedAt",
	header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewed" />,
	cell: ({ row }) =>
		row.original.reviewedAt ? (
			<span className="text-sm text-muted-foreground">{formatShortDate(row.original.reviewedAt)}</span>
		) : (
			<span className="text-xs italic text-muted-foreground">pending</span>
		),
};

const columnMap: Record<ReviewQueueColumnId, ColumnDef<ReviewQueueItem>> = {
	reference,
	applicantName,
	wardName,
	programName,
	educationLevel,
	aiScore,
	status,
	wardRecommendationKes,
	countyAllocationKes,
	reviewerName,
	reviewedAt,
};

function buildActionColumn(
	primary: RowAction | undefined,
	menuActions: RowAction[] | undefined,
): ColumnDef<ReviewQueueItem> {
	return {
		id: "actions",
		header: () => <span className="sr-only">Actions</span>,
		cell: ({ row }) => {
			const item = row.original;
			const hasMenu = menuActions && menuActions.length > 0;
			return (
				<div className="flex items-center justify-end gap-2">
					{primary ? (
						primary.href ? (
							<Button asChild size="sm" variant={primary.variant ?? "default"}>
								<Link href={primary.href(item)}>{primary.label}</Link>
							</Button>
						) : (
							<Button
								size="sm"
								variant={primary.variant ?? "default"}
								onClick={() => primary.onClick?.(item)}
							>
								{primary.label}
							</Button>
						)
					) : null}
					{hasMenu ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" aria-label="Row actions">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{menuActions!.map((action) =>
									action.href ? (
										<DropdownMenuItem key={action.label} asChild>
											<Link href={action.href(item)}>{action.label}</Link>
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem
											key={action.label}
											onClick={() => action.onClick?.(item)}
										>
											{action.label}
										</DropdownMenuItem>
									),
								)}
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => navigator.clipboard.writeText(item.reference)}
								>
									Copy reference
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			);
		},
	};
}

export function buildReviewQueueColumns({
	columns,
	primaryAction,
	menuActions,
}: BuildColumnsOptions): ColumnDef<ReviewQueueItem>[] {
	const resolved = columns.map((id) => columnMap[id]);
	if (primaryAction || (menuActions && menuActions.length > 0)) {
		resolved.push(buildActionColumn(primaryAction, menuActions));
	}
	return resolved;
}

export const reviewQueueStatusOptions = [
	{ label: "Submitted", value: "SUBMITTED" },
	{ label: "Ward Review", value: "WARD_REVIEW" },
	{ label: "County Review", value: "COUNTY_REVIEW" },
	{ label: "Approved", value: "APPROVED" },
	{ label: "Rejected", value: "REJECTED" },
	{ label: "Waitlisted", value: "WAITLISTED" },
	{ label: "Disbursed", value: "DISBURSED" },
];
