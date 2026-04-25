"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import {
	arrayIncludesFilterFn,
	dateRangeFilterFn,
	numberRangeFilterFn,
} from "@/components/shared/data-table-column-filter";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/format";
import type { OpsServiceHealthItem } from "@/lib/ops-api";

const statusVariantMap: Record<OpsServiceHealthItem["status"], "success" | "warning" | "danger"> = {
	healthy: "success",
	degraded: "warning",
	down: "danger",
};

export const opsHealthStatusOptions = [
	{ label: "Healthy", value: "healthy" },
	{ label: "Degraded", value: "degraded" },
	{ label: "Down", value: "down" },
];

export const opsHealthColumns: ColumnDef<OpsServiceHealthItem>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Service"
				filter={{ type: "text", placeholder: "Search service" }}
			/>
		),
		cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
		filterFn: "includesString",
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Status"
				filter={{ type: "multiselect", options: opsHealthStatusOptions }}
			/>
		),
		cell: ({ row }) => (
			<Badge variant={statusVariantMap[row.original.status]}>{row.original.status}</Badge>
		),
		filterFn: arrayIncludesFilterFn,
	},
	{
		accessorKey: "latencyMs",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Latency"
				align="end"
				filter={{ type: "number", suffix: "ms", min: 0, step: 10 }}
			/>
		),
		cell: ({ row }) => (
			<div className="text-right font-mono text-sm tabular-nums text-muted-foreground">
				{row.original.latencyMs} ms
			</div>
		),
		filterFn: numberRangeFilterFn,
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Last Update"
				filter={{ type: "dateRange" }}
			/>
		),
		cell: ({ row }) => (
			<span className="text-sm text-muted-foreground">{formatShortDate(row.original.updatedAt)}</span>
		),
		filterFn: dateRangeFilterFn,
	},
	{
		accessorKey: "note",
		header: "Note",
		enableSorting: false,
		cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.note}</span>,
	},
];
