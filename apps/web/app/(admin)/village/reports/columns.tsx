"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import type { VillageSummaryRow } from "@/lib/reporting-api";
import { ColumnDef } from "@tanstack/react-table";

export const villageReportColumns: ColumnDef<VillageSummaryRow>[] = [
	{
		accessorKey: "reference",
		header: "Reference",
		cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("reference")}</span>,
	},
	{
		accessorKey: "applicantName",
		header: "Applicant",
	},
	{
		accessorKey: "villageUnitName",
		header: "Village Unit",
	},
	{
		accessorKey: "wardName",
		header: "Ward",
	},
	{
		accessorKey: "programName",
		header: "Program",
	},
	{
		accessorKey: "academicYear",
		header: "Academic Year",
	},
	{
		accessorKey: "educationLevel",
		header: "Education Level",
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			let variant: "default" | "secondary" | "destructive" | "outline" = "default";
			if (status === "APPROVED" || status === "DISBURSED") variant = "default";
			else if (status === "REJECTED") variant = "destructive";
			else if (status === "PENDING") variant = "secondary";
			else variant = "outline";
			return <Badge variant={variant}>{status}</Badge>;
		},
	},
	{
		accessorKey: "aiScore",
		header: "AI Score",
		cell: ({ row }) => <span className="font-mono">{row.getValue("aiScore")}</span>,
	},
	{
		accessorKey: "villageRecommendationKes",
		header: "Recommended (KES)",
		cell: ({ row }) => formatCurrencyKes(row.getValue("villageRecommendationKes")),
	},
	{
		accessorKey: "countyAllocationKes",
		header: "Allocated (KES)",
		cell: ({ row }) => formatCurrencyKes(row.getValue("countyAllocationKes")),
	},
	{
		accessorKey: "reviewerName",
		header: "Reviewer",
	},
	{
		accessorKey: "reviewerStage",
		header: "Reviewer Stage",
	},
	{
		accessorKey: "reviewedAt",
		header: "Reviewed At",
		cell: ({ row }) => {
			const value = row.getValue("reviewedAt") as string | null;
			return value ? formatShortDate(value) : "—";
		},
	},
];
