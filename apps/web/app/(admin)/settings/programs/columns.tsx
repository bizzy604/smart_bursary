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
import type { ProgramListItem, ProgramStatus } from "@/lib/admin-programs";

const statusBadgeClass: Record<ProgramStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border border-gray-200",
  ACTIVE: "bg-success-50 text-success-700 border border-success-200",
  CLOSED: "bg-warning-50 text-warning-700 border border-warning-200",
  SUSPENDED: "bg-danger-50 text-danger-700 border border-danger-200",
  ARCHIVED: "bg-gray-100 text-gray-500 border border-gray-200",
};

export type ProgramRowAction =
  | "publish"
  | "close"
  | "archive"
  | "unarchive"
  | "delete";

type ProgramListColumnsOptions = {
  mutatingProgramIds: Set<string>;
  onRequestAction: (action: ProgramRowAction, program: ProgramListItem) => void;
};

export function buildProgramListColumns({
  mutatingProgramIds,
  onRequestAction,
}: ProgramListColumnsOptions): ColumnDef<ProgramListItem>[] {
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
      filterFn: "includesString",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-brand-900">{row.original.name}</p>
          <p className="text-xs text-gray-600">
            Year: {row.original.academicYear ?? "-"}
          </p>
          <p className="text-xs text-gray-600">
            Ward: {row.original.wardId ?? "County-wide"}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Status"
          filter={{
            type: "multiselect",
            options: [
              { label: "Draft", value: "DRAFT" },
              { label: "Active", value: "ACTIVE" },
              { label: "Closed", value: "CLOSED" },
              { label: "Suspended", value: "SUSPENDED" },
              { label: "Archived", value: "ARCHIVED" },
            ],
          }}
        />
      ),
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[row.original.status]}`}
        >
          {row.original.status}
        </span>
      ),
      filterFn: arrayIncludesFilterFn,
    },
    {
      id: "opensAt",
      accessorKey: "opensAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Opens"
          filter={{ type: "dateRange" }}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatShortDate(row.original.opensAt)}
        </span>
      ),
      filterFn: dateRangeFilterFn,
    },
    {
      id: "closesAt",
      accessorKey: "closesAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Closes"
          filter={{ type: "dateRange" }}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatShortDate(row.original.closesAt)}
        </span>
      ),
      filterFn: dateRangeFilterFn,
    },
    {
      id: "budgetCeiling",
      accessorKey: "budgetCeiling",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Budget"
          align="end"
          filter={{ type: "number", suffix: "KES", step: 10000 }}
        />
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatCurrencyKes(row.original.budgetCeiling)}
        </div>
      ),
      filterFn: numberRangeFilterFn,
    },
    {
      id: "allocatedTotal",
      accessorKey: "allocatedTotal",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Allocated"
          align="end"
          filter={{ type: "number", suffix: "KES", step: 10000 }}
        />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {formatCurrencyKes(row.original.allocatedTotal)}
        </div>
      ),
      filterFn: numberRangeFilterFn,
    },
    {
      id: "disbursedTotal",
      accessorKey: "disbursedTotal",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Disbursed"
          align="end"
          filter={{ type: "number", suffix: "KES", step: 10000 }}
        />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {formatCurrencyKes(row.original.disbursedTotal)}
        </div>
      ),
      filterFn: numberRangeFilterFn,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const program = row.original;
        const isMutating = mutatingProgramIds.has(program.id);
        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href={`/county/programs/${program.id}` as Route}>
              <Button variant="outline" size="sm">
                Open
              </Button>
            </Link>
            {program.status === "DRAFT" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRequestAction("publish", program)}
                disabled={isMutating}
              >
                {isMutating ? "Publishing..." : "Publish"}
              </Button>
            ) : null}
            {program.status === "ACTIVE" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRequestAction("close", program)}
                disabled={isMutating}
              >
                {isMutating ? "Closing..." : "Close"}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More actions"
                  disabled={isMutating}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>More</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {program.status === "ARCHIVED" ? (
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      onRequestAction("unarchive", program);
                    }}
                  >
                    Restore from archive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      onRequestAction("archive", program);
                    }}
                  >
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger-700 focus:bg-danger-50 focus:text-danger-700"
                  onSelect={(event) => {
                    event.preventDefault();
                    onRequestAction("delete", program);
                  }}
                >
                  Delete program
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
