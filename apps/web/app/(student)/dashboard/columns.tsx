"use client";

import Link from "next/link";
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
import type { StudentApplicationSummary } from "@/lib/student-types";

export const studentApplicationColumns: ColumnDef<StudentApplicationSummary>[] = [
	{
		accessorKey: "reference",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
		cell: ({ row }) => (
			<span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
				{row.original.reference}
			</span>
		),
	},
	{
		accessorKey: "programName",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
		cell: ({ row }) => (
			<span className="font-medium text-foreground">{row.original.programName}</span>
		),
	},
	{
		accessorKey: "status",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
		cell: ({ row }) => <StatusBadge status={row.original.status} />,
		filterFn: (row, _id, value: string[]) => value.includes(row.original.status),
	},
	{
		accessorKey: "requestedKes",
		header: ({ column }) => (
			<div className="text-right">
				<DataTableColumnHeader column={column} title="Requested" />
			</div>
		),
		cell: ({ row }) => (
			<div className="text-right font-medium tabular-nums">
				{formatCurrencyKes(row.original.requestedKes)}
			</div>
		),
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">{formatShortDate(row.original.updatedAt)}</span>
		),
	},
	{
		id: "actions",
		header: () => <span className="sr-only">Actions</span>,
		cell: ({ row }) => {
			const application = row.original;
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
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];

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
