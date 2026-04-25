"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { formatCurrencyKes } from "@/lib/format";
import type { OcobRow } from "@/lib/reporting-api";

export const ocobReportColumns: ColumnDef<OcobRow>[] = [
  {
    id: "programName",
    accessorKey: "programName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.programName}</span>,
  },
  {
    id: "academicYear",
    accessorKey: "academicYear",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Academic Year" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.academicYear}</span>,
  },
  {
    id: "applications",
    accessorKey: "applications",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Applications" />
      </div>
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.applications}</div>,
  },
  {
    id: "approved",
    accessorKey: "approved",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Approved" />
      </div>
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.approved}</div>,
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
        <DataTableColumnHeader column={column} title="Disbursed" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatCurrencyKes(row.original.disbursedKes)}
      </div>
    ),
  },
  {
    id: "balanceKes",
    accessorKey: "balanceKes",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Balance" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatCurrencyKes(row.original.balanceKes)}
      </div>
    ),
  },
];
