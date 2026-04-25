"use client";

import Link from "next/link";
import type { Route } from "next";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import {
	arrayIncludesFilterFn,
	dateRangeFilterFn,
	numberRangeFilterFn,
} from "@/components/shared/data-table-column-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatShortDate } from "@/lib/format";
import type { OpsTenantSummary } from "@/lib/ops-api";

export const opsTenantPlanOptions = [
	{ label: "Basic", value: "BASIC" },
	{ label: "Standard", value: "STANDARD" },
	{ label: "Enterprise", value: "ENTERPRISE" },
];

export const opsTenantStatusOptions = [
	{ label: "Active", value: "active" },
	{ label: "Inactive", value: "inactive" },
];

export const opsTenantColumns: ColumnDef<OpsTenantSummary>[] = [
	{
		accessorKey: "countyName",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="County"
				filter={{ type: "text", placeholder: "Search county" }}
			/>
		),
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span className="font-medium text-foreground">{row.original.countyName}</span>
				<span className="text-xs text-muted-foreground">Slug {row.original.slug}</span>
			</div>
		),
		filterFn: "includesString",
	},
	{
		accessorKey: "planTier",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Plan"
				filter={{ type: "multiselect", options: opsTenantPlanOptions }}
			/>
		),
		cell: ({ row }) => (
			<span className="font-mono text-xs font-semibold uppercase">Plan {row.original.planTier}</span>
		),
		filterFn: arrayIncludesFilterFn,
	},
	{
		id: "status",
		accessorFn: (row) => (row.isActive ? "active" : "inactive"),
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Status"
				filter={{ type: "multiselect", options: opsTenantStatusOptions }}
			/>
		),
		cell: ({ row }) => (
			<Badge variant={row.original.isActive ? "success" : "danger"}>
				{row.original.isActive ? "Active" : "Inactive"}
			</Badge>
		),
		filterFn: arrayIncludesFilterFn,
	},
	{
		accessorKey: "userCount",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Users"
				align="end"
				filter={{ type: "number", min: 0, step: 1 }}
			/>
		),
		cell: ({ row }) => <div className="text-right tabular-nums">{row.original.userCount}</div>,
		filterFn: numberRangeFilterFn,
	},
	{
		accessorKey: "wardCount",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Wards"
				align="end"
				filter={{ type: "number", min: 0, step: 1 }}
			/>
		),
		cell: ({ row }) => <div className="text-right tabular-nums">{row.original.wardCount}</div>,
		filterFn: numberRangeFilterFn,
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Provisioned"
				filter={{ type: "dateRange" }}
			/>
		),
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">{formatShortDate(row.original.createdAt)}</span>
		),
		filterFn: dateRangeFilterFn,
	},
	{
		id: "actions",
		header: () => <span className="sr-only">Actions</span>,
		cell: ({ row }) => {
			const tenant = row.original;
			return (
				<div className="flex items-center justify-end gap-2">
					<Button asChild size="sm">
						<Link href={`/tenants/${tenant.slug}` as Route}>Open Tenant Detail</Link>
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" aria-label="Row actions">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => navigator.clipboard.writeText(tenant.slug)}
							>
								Copy slug
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => navigator.clipboard.writeText(tenant.id)}
							>
								Copy tenant ID
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];
