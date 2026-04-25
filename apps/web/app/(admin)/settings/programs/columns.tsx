"use client";

import Link from "next/link";
import type { Route } from "next";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import type { ProgramListItem, ProgramStatus } from "@/lib/admin-programs";

const statusBadgeClass: Record<ProgramStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border border-gray-200",
  ACTIVE: "bg-success-50 text-success-700 border border-success-200",
  CLOSED: "bg-warning-50 text-warning-700 border border-warning-200",
  SUSPENDED: "bg-danger-50 text-danger-700 border border-danger-200",
};

type ProgramListColumnsOptions = {
  isMutating: string | null;
  onRequestPublish: (program: ProgramListItem) => void;
  onRequestClose: (program: ProgramListItem) => void;
};

export function buildProgramListColumns({
  isMutating,
  onRequestPublish,
  onRequestClose,
}: ProgramListColumnsOptions): ColumnDef<ProgramListItem>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-brand-900">{row.original.name}</p>
          <p className="text-xs text-gray-600">Year: {row.original.academicYear ?? "-"}</p>
          <p className="text-xs text-gray-600">Ward: {row.original.wardId ?? "County-wide"}</p>
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[row.original.status]}`}>
          {row.original.status}
        </span>
      ),
      filterFn: (row, _id, value: string[]) => value.includes(row.original.status),
    },
    {
      id: "opensAt",
      accessorKey: "opensAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Opens" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatShortDate(row.original.opensAt)}</span>,
    },
    {
      id: "closesAt",
      accessorKey: "closesAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Closes" />,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatShortDate(row.original.closesAt)}</span>,
    },
    {
      id: "budgetCeiling",
      accessorKey: "budgetCeiling",
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Budget" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatCurrencyKes(row.original.budgetCeiling)}
        </div>
      ),
    },
    {
      id: "allocatedTotal",
      accessorKey: "allocatedTotal",
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Allocated" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {formatCurrencyKes(row.original.allocatedTotal)}
        </div>
      ),
    },
    {
      id: "disbursedTotal",
      accessorKey: "disbursedTotal",
      header: ({ column }) => (
        <div className="text-right">
          <DataTableColumnHeader column={column} title="Disbursed" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {formatCurrencyKes(row.original.disbursedTotal)}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/county/programs/${row.original.id}` as Route}>
            <Button variant="outline" size="sm">Open</Button>
          </Link>
          {row.original.status === "DRAFT" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestPublish(row.original)}
              disabled={isMutating === row.original.id}
            >
              {isMutating === row.original.id ? "Publishing..." : "Publish"}
            </Button>
          ) : null}
          {row.original.status === "ACTIVE" ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onRequestClose(row.original)}
              disabled={isMutating === row.original.id}
            >
              {isMutating === row.original.id ? "Closing..." : "Close"}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
}
