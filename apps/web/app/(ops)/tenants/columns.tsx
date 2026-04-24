"use client";

import Link from "next/link";
import type { Route } from "next";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
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

export const opsTenantColumns: ColumnDef<OpsTenantSummary>[] = [
	{
		accessorKey: "countyName",
		header: ({ column }) => <DataTableColumnHeader column={column} title="County" />,
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span className="font-medium text-foreground">{row.original.countyName}</span>
				<span className="text-xs text-muted-foreground">Slug {row.original.slug}</span>
			</div>
		),
	},
	{
		accessorKey: "planTier",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
		cell: ({ row }) => (
			<span className="font-mono text-xs font-semibold uppercase">Plan {row.original.planTier}</span>
		),
		filterFn: (row, _id, value: string[]) => value.includes(row.original.planTier),
	},
	{
		id: "status",
		accessorFn: (row) => (row.isActive ? "active" : "inactive"),
		header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
		cell: ({ row }) => (
			<Badge variant={row.original.isActive ? "success" : "danger"}>
				{row.original.isActive ? "Active" : "Inactive"}
			</Badge>
		),
		filterFn: (row, _id, value: string[]) => value.includes(row.original.isActive ? "active" : "inactive"),
	},
	{
		accessorKey: "userCount",
		header: ({ column }) => (
			<div className="text-right">
				<DataTableColumnHeader column={column} title="Users" />
			</div>
		),
		cell: ({ row }) => <div className="text-right tabular-nums">{row.original.userCount}</div>,
	},
	{
		accessorKey: "wardCount",
		header: ({ column }) => (
			<div className="text-right">
				<DataTableColumnHeader column={column} title="Wards" />
			</div>
		),
		cell: ({ row }) => <div className="text-right tabular-nums">{row.original.wardCount}</div>,
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Provisioned" />,
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">{formatShortDate(row.original.createdAt)}</span>
		),
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

export const opsTenantPlanOptions = [
	{ label: "Basic", value: "BASIC" },
	{ label: "Standard", value: "STANDARD" },
	{ label: "Enterprise", value: "ENTERPRISE" },
];

export const opsTenantStatusOptions = [
	{ label: "Active", value: "active" },
	{ label: "Inactive", value: "inactive" },
];
