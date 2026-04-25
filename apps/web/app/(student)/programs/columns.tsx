"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatPercent, formatShortDate } from "@/lib/format";
import type { StudentProgramSummary } from "@/lib/student-types";

export const studentProgramColumns: ColumnDef<StudentProgramSummary>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium text-foreground">{row.original.name}</p>
        <p className="max-w-xl text-sm text-muted-foreground">{row.original.summary}</p>
      </div>
    ),
  },
  {
    id: "ward",
    accessorKey: "ward",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ward Scope" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.ward}</span>,
    filterFn: (row, _id, value: string[]) => value.includes(row.original.ward),
  },
  {
    id: "closesAt",
    accessorKey: "closesAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Deadline" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatShortDate(row.original.closesAt)}</span>,
  },
  {
    id: "budgetCeilingKes",
    accessorKey: "budgetCeilingKes",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Budget Ceiling" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatCurrencyKes(row.original.budgetCeilingKes)}
      </div>
    ),
  },
  {
    id: "allocatedKes",
    accessorKey: "allocatedKes",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Committed" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-muted-foreground">
        {formatCurrencyKes(row.original.allocatedKes)}
      </div>
    ),
  },
  {
    id: "utilization",
    accessorFn: (row) => (row.budgetCeilingKes > 0 ? (row.allocatedKes / row.budgetCeilingKes) * 100 : 0),
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Utilization" />
      </div>
    ),
    cell: ({ getValue }) => (
      <div className="text-right font-medium tabular-nums text-brand-900">
        {formatPercent(Number(getValue<number>()))}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href={`/programs/${row.original.id}`}>Open</Link>
        </Button>
      </div>
    ),
  },
];
