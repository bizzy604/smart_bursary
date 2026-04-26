"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/application/status-badge";
import { DataTableColumnHeader } from "@/components/shared/data-table-column-header";
import {
  arrayIncludesFilterFn,
  dateRangeFilterFn,
  numberRangeFilterFn,
} from "@/components/shared/data-table-column-filter";
import { reviewQueueStatusOptions } from "@/components/shared/review-queue-columns";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import type { WardSummaryRow } from "@/lib/reporting-api";
import type { ApplicationStatus } from "@/lib/student-types";

const educationLevelOptions = [
  { label: "University", value: "UNIVERSITY" },
  { label: "TVET", value: "TVET" },
  { label: "Secondary", value: "SECONDARY" },
];

export const wardReportColumns: ColumnDef<WardSummaryRow>[] = [
  {
    id: "reference",
    accessorKey: "reference",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Reference"
        filter={{ type: "text", placeholder: "Search reference" }}
      />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        {row.original.reference}
      </span>
    ),
    filterFn: "includesString",
  },
  {
    id: "applicantName",
    accessorKey: "applicantName",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Applicant"
        filter={{ type: "text", placeholder: "Search applicant" }}
      />
    ),
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.applicantName}</span>,
    filterFn: "includesString",
  },
  {
    id: "programName",
    accessorKey: "programName",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Program"
        filter={{ type: "text", placeholder: "Search program" }}
      />
    ),
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.programName}</span>,
    filterFn: "includesString",
  },
  {
    id: "academicYear",
    accessorKey: "academicYear",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Year"
        filter={{ type: "text", placeholder: "e.g. 2024" }}
      />
    ),
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.academicYear}</span>,
    filterFn: "includesString",
  },
  {
    id: "educationLevel",
    accessorKey: "educationLevel",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Level"
        filter={{ type: "multiselect", options: educationLevelOptions }}
      />
    ),
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.educationLevel}</span>,
    filterFn: arrayIncludesFilterFn,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Status"
        filter={{ type: "multiselect", options: reviewQueueStatusOptions }}
      />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status as ApplicationStatus} />,
    filterFn: arrayIncludesFilterFn,
  },
  {
    id: "aiScore",
    accessorKey: "aiScore",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="AI Score"
        align="end"
        filter={{ type: "number", min: 0, max: 100, step: 1 }}
      />
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums text-primary">
        {row.original.aiScore.toFixed(1)}
      </div>
    ),
    filterFn: numberRangeFilterFn,
  },
  {
    id: "wardRecommendationKes",
    accessorKey: "wardRecommendationKes",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Recommended"
        align="end"
        filter={{ type: "number", suffix: "KES", step: 1000 }}
      />
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatCurrencyKes(row.original.wardRecommendationKes)}
      </div>
    ),
    filterFn: numberRangeFilterFn,
  },
  {
    id: "countyAllocationKes",
    accessorKey: "countyAllocationKes",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Allocated"
        align="end"
        filter={{ type: "number", suffix: "KES", step: 1000 }}
      />
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatCurrencyKes(row.original.countyAllocationKes)}
      </div>
    ),
    filterFn: numberRangeFilterFn,
  },
  {
    id: "reviewerStage",
    accessorKey: "reviewerStage",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Reviewer Stage"
        filter={{ type: "text", placeholder: "Search stage" }}
      />
    ),
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.reviewerStage}</span>,
    filterFn: "includesString",
  },
  {
    id: "reviewedAt",
    accessorKey: "reviewedAt",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Reviewed"
        filter={{ type: "dateRange" }}
      />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.reviewedAt ? formatShortDate(row.original.reviewedAt) : "Pending"}
      </span>
    ),
    filterFn: dateRangeFilterFn,
  },
];
