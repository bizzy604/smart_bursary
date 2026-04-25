"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { formatCurrencyKes } from "@/lib/format";
import type { TrendRow } from "@/lib/reporting-api";

export const countyTrendColumns: ColumnDef<TrendRow>[] = [
  {
    id: "academicYear",
    accessorKey: "academicYear",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Academic Year" />,
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.academicYear}</span>,
  },
  {
    id: "totalApplications",
    accessorKey: "totalApplications",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Applications" />
      </div>
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.totalApplications}</div>,
  },
  {
    id: "approvedApplications",
    accessorKey: "approvedApplications",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Approved" />
      </div>
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.approvedApplications}</div>,
  },
  {
    id: "disbursedApplications",
    accessorKey: "disbursedApplications",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Disbursed" />
      </div>
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.disbursedApplications}</div>,
  },
  {
    id: "allocatedKes",
    accessorKey: "allocatedKes",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Allocated" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatCurrencyKes(row.original.allocatedKes)}
      </div>
    ),
  },
  {
    id: "disbursedKes",
    accessorKey: "disbursedKes",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Disbursed Amount" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatCurrencyKes(row.original.disbursedKes)}
      </div>
    ),
  },
];
