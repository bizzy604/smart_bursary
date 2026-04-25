"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/application/status-badge";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import type { WardSummaryRow } from "@/lib/reporting-api";
import type { ApplicationStatus } from "@/lib/student-types";

export const wardReportColumns: ColumnDef<WardSummaryRow>[] = [
  {
    id: "reference",
    accessorKey: "reference",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        {row.original.reference}
      </span>
    ),
  },
  {
    id: "applicantName",
    accessorKey: "applicantName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Applicant" />,
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.applicantName}</span>,
  },
  {
    id: "programName",
    accessorKey: "programName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.programName}</span>,
  },
  {
    id: "academicYear",
    accessorKey: "academicYear",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Year" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.academicYear}</span>,
  },
  {
    id: "educationLevel",
    accessorKey: "educationLevel",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Level" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.educationLevel}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.original.status as ApplicationStatus} />,
    filterFn: (row, _id, value: string[]) => value.includes(row.original.status),
  },
  {
    id: "aiScore",
    accessorKey: "aiScore",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="AI Score" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums text-brand-900">
        {row.original.aiScore.toFixed(1)}
      </div>
    ),
  },
  {
    id: "wardRecommendationKes",
    accessorKey: "wardRecommendationKes",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Recommended" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatCurrencyKes(row.original.wardRecommendationKes)}
      </div>
    ),
  },
  {
    id: "countyAllocationKes",
    accessorKey: "countyAllocationKes",
    header: ({ column }) => (
      <div className="text-right">
        <DataTableColumnHeader column={column} title="Allocated" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatCurrencyKes(row.original.countyAllocationKes)}
      </div>
    ),
  },
  {
    id: "reviewerStage",
    accessorKey: "reviewerStage",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewer Stage" />,
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reviewerStage}</span>,
  },
  {
    id: "reviewedAt",
    accessorKey: "reviewedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewed" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.reviewedAt ? formatShortDate(row.original.reviewedAt) : "Pending"}
      </span>
    ),
  },
];
