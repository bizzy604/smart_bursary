"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import {
  arrayIncludesFilterFn,
  dateRangeFilterFn,
  numberRangeFilterFn,
  type ColumnFilterOption,
} from "@/components/shared/data-table-column-filter";
import { Button } from "@/components/ui/button";
import { formatCurrencyKes, formatPercent, formatShortDate } from "@/lib/format";
import type { StudentProgramSummary } from "@/lib/student-types";

export interface BuildStudentProgramColumnsOptions {
  wardOptions?: ColumnFilterOption[];
}

export function buildStudentProgramColumns(
  options: BuildStudentProgramColumnsOptions = {},
): ColumnDef<StudentProgramSummary>[] {
  const wardFilter: ColumnDef<StudentProgramSummary>["header"] = ({ column }) =>
    options.wardOptions && options.wardOptions.length > 0 ? (
      <DataTableColumnHeader
        column={column}
        title="Ward Scope"
        filter={{ type: "multiselect", options: options.wardOptions }}
      />
    ) : (
      <DataTableColumnHeader
        column={column}
        title="Ward Scope"
        filter={{ type: "text", placeholder: "Search ward" }}
      />
    );

  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Program"
          filter={{ type: "text", placeholder: "Search program" }}
        />
      ),
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="max-w-xl text-sm text-muted-foreground">{row.original.summary}</p>
        </div>
      ),
      filterFn: "includesString",
    },
    {
      id: "ward",
      accessorKey: "ward",
      header: wardFilter,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.ward}</span>
      ),
      filterFn:
        options.wardOptions && options.wardOptions.length > 0
          ? arrayIncludesFilterFn
          : "includesString",
    },
    {
      id: "closesAt",
      accessorKey: "closesAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Deadline"
          filter={{ type: "dateRange" }}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatShortDate(row.original.closesAt)}</span>
      ),
      filterFn: dateRangeFilterFn,
    },
    {
      id: "budgetCeilingKes",
      accessorKey: "budgetCeilingKes",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Budget Ceiling"
          align="end"
          filter={{ type: "number", suffix: "KES", step: 10000 }}
        />
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatCurrencyKes(row.original.budgetCeilingKes)}
        </div>
      ),
      filterFn: numberRangeFilterFn,
    },
    {
      id: "allocatedKes",
      accessorKey: "allocatedKes",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Committed"
          align="end"
          filter={{ type: "number", suffix: "KES", step: 10000 }}
        />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {formatCurrencyKes(row.original.allocatedKes)}
        </div>
      ),
      filterFn: numberRangeFilterFn,
    },
    {
      id: "utilization",
      accessorFn: (row) =>
        row.budgetCeilingKes > 0 ? (row.allocatedKes / row.budgetCeilingKes) * 100 : 0,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Utilization"
          align="end"
          filter={{ type: "number", suffix: "%", min: 0, max: 100, step: 1 }}
        />
      ),
      cell: ({ getValue }) => (
        <div className="text-right font-medium tabular-nums text-brand-900">
          {formatPercent(Number(getValue<number>()))}
        </div>
      ),
      filterFn: numberRangeFilterFn,
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
}

export const studentProgramColumns = buildStudentProgramColumns();
