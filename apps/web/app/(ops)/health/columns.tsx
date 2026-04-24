"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/format";
import type { OpsServiceHealthItem } from "@/lib/ops-api";

const statusVariantMap: Record<OpsServiceHealthItem["status"], "success" | "warning" | "danger"> = {
	healthy: "success",
	degraded: "warning",
	down: "danger",
};

export const opsHealthColumns: ColumnDef<OpsServiceHealthItem>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Service" />,
		cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
	},
	{
		accessorKey: "status",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
		cell: ({ row }) => (
			<Badge variant={statusVariantMap[row.original.status]}>{row.original.status}</Badge>
		),
		filterFn: (row, _id, value: string[]) => value.includes(row.original.status),
	},
	{
		accessorKey: "latencyMs",
		header: ({ column }) => (
			<div className="text-right">
				<DataTableColumnHeader column={column} title="Latency" />
			</div>
		),
		cell: ({ row }) => (
			<div className="text-right font-mono text-sm tabular-nums text-muted-foreground">
				{row.original.latencyMs} ms
			</div>
		),
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => <DataTableColumnHeader column={column} title="Last Update" />,
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">{formatShortDate(row.original.updatedAt)}</span>
		),
	},
	{
		accessorKey: "note",
		header: "Note",
		enableSorting: false,
		cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.note}</span>,
	},
];

export const opsHealthStatusOptions = [
	{ label: "Healthy", value: "healthy" },
	{ label: "Degraded", value: "degraded" },
	{ label: "Down", value: "down" },
];
