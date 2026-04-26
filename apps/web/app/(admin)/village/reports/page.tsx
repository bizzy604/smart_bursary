"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { DataTableCsvExportButton } from "@/components/shared/data-table-csv-export-button";
import { Button } from "@/components/ui/button";
import { type SpreadsheetColumn } from "@/lib/csv-export";
import { formatCurrencyKes, formatShortDate } from "@/lib/format";
import {
	downloadVillageSummaryExport,
	fetchVillageSummaryReport,
	type VillageSummaryRow,
} from "@/lib/reporting-api";
import { villageReportColumns } from "./columns";

const VILLAGE_SUMMARY_CSV_COLUMNS: SpreadsheetColumn<VillageSummaryRow>[] = [
	{ header: "Reference", value: (row) => row.reference, width: 20 },
	{ header: "Applicant", value: (row) => row.applicantName, width: 28 },
	{ header: "Village Unit", value: (row) => row.villageUnitName, width: 18 },
	{ header: "Ward", value: (row) => row.wardName, width: 18 },
	{ header: "Program", value: (row) => row.programName, width: 32 },
	{ header: "Academic Year", value: (row) => row.academicYear, width: 14 },
	{ header: "Education Level", value: (row) => row.educationLevel, width: 16 },
	{ header: "Status", value: (row) => row.status, width: 16 },
	{ header: "AI Score", value: (row) => row.aiScore, type: "number", format: "0.0", width: 12 },
	{ header: "Recommended (KES)", value: (row) => row.villageRecommendationKes, type: "currency", width: 20 },
	{ header: "Allocated (KES)", value: (row) => row.countyAllocationKes, type: "currency", width: 18 },
	{ header: "Reviewer", value: (row) => row.reviewerName, width: 22 },
	{ header: "Reviewer Stage", value: (row) => row.reviewerStage, width: 18 },
	{ header: "Reviewed At", value: (row) => row.reviewedAt, type: "date", width: 14 },
];

type VillageFilters = {
	programId: string;
	villageUnitId: string;
	wardId: string;
	academicYear: string;
	educationLevel: string;
};

function saveBlob(blob: Blob, filename: string): void {
	if (typeof window === "undefined") {
		return;
	}

	const url = window.URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	window.URL.revokeObjectURL(url);
}

export default function VillageReportsPage() {
	const [catalogRows, setCatalogRows] = useState<VillageSummaryRow[]>([]);
	const [rows, setRows] = useState<VillageSummaryRow[]>([]);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);
	const [filters, setFilters] = useState<VillageFilters>({
		programId: "",
		villageUnitId: "",
		wardId: "",
		academicYear: "",
		educationLevel: "",
	});
	const [isLoading, setIsLoading] = useState(true);
	const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
	const [error, setError] = useState<string | null>(null);

	const loadReport = async (scope: VillageFilters = filters) => {
		try {
			setIsLoading(true);
			const shouldRefreshCatalog =
				catalogRows.length === 0
				&& !scope.programId
				&& !scope.villageUnitId
				&& !scope.wardId
				&& !scope.academicYear
				&& !scope.educationLevel;

			const [catalogReport, villageReport] = await Promise.all([
				shouldRefreshCatalog ? fetchVillageSummaryReport({}) : Promise.resolve(null),
				fetchVillageSummaryReport({
					programId: scope.programId || undefined,
					villageUnitId: scope.villageUnitId || undefined,
					wardId: scope.wardId || undefined,
					academicYear: scope.academicYear || undefined,
					educationLevel: scope.educationLevel || undefined,
				}),
			]);

			if (catalogReport) {
				setCatalogRows(catalogReport.rows);
			}
			setRows(villageReport.rows);
			setGeneratedAt(villageReport.generatedAt);
			setError(null);
		} catch (loadError: unknown) {
			setError(loadError instanceof Error ? loadError.message : "Failed to load village summary report.");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadReport();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const totals = useMemo(
		() =>
			rows.reduce(
				(summary, row) => ({
					applications: summary.applications + 1,
					approved: summary.approved + (row.status === "APPROVED" || row.status === "DISBURSED" ? 1 : 0),
					rejected: summary.rejected + (row.status === "REJECTED" ? 1 : 0),
					recommendedKes: summary.recommendedKes + row.villageRecommendationKes,
					allocatedKes: summary.allocatedKes + row.countyAllocationKes,
					disbursedKes: summary.disbursedKes + (row.status === "DISBURSED" ? row.countyAllocationKes : 0),
				}),
				{ applications: 0, approved: 0, rejected: 0, recommendedKes: 0, allocatedKes: 0, disbursedKes: 0 },
			),
		[rows],
	);

	const filterSourceRows = catalogRows.length > 0 ? catalogRows : rows;

	const programOptions = useMemo(() => {
		const values = new Map<string, string>();
		for (const row of filterSourceRows) {
			if (!values.has(row.programId)) {
				values.set(row.programId, row.programName);
			}
		}

		return Array.from(values.entries())
			.map(([id, name]) => ({ id, name }))
			.sort((left, right) => left.name.localeCompare(right.name));
	}, [filterSourceRows]);

	const academicYearOptions = useMemo(() => {
		const values = new Set<string>();
		for (const row of filterSourceRows) {
			values.add(row.academicYear);
		}
		return Array.from(values).sort();
	}, [filterSourceRows]);

	const wardOptions = useMemo(() => {
		const entries = new Map<string, string>();
		for (const row of filterSourceRows) {
			if (!entries.has(row.wardId)) {
				entries.set(row.wardId, row.wardName);
			}
		}

		return Array.from(entries.entries())
			.map(([id, name]) => ({ id, name }))
			.sort((left, right) => left.name.localeCompare(right.name));
	}, [filterSourceRows]);

	const villageUnitOptions = useMemo(() => {
		const entries = new Map<string, string>();
		for (const row of filterSourceRows) {
			if (!entries.has(row.villageUnitId)) {
				entries.set(row.villageUnitId, row.villageUnitName);
			}
		}

		return Array.from(entries.entries())
			.map(([id, name]) => ({ id, name }))
			.sort((left, right) => left.name.localeCompare(right.name));
	}, [filterSourceRows]);

	const exportReport = async (format: "csv" | "pdf") => {
		try {
			setExporting(format);
			const blob = await downloadVillageSummaryExport(
				{
					programId: filters.programId || undefined,
					villageUnitId: filters.villageUnitId || undefined,
					wardId: filters.wardId || undefined,
					academicYear: filters.academicYear || undefined,
					educationLevel: filters.educationLevel || undefined,
				},
				format,
			);
			saveBlob(blob, format === "csv" ? "village-summary-report.csv" : "village-summary-report.pdf");
		} catch (exportError: unknown) {
			setError(exportError instanceof Error ? exportError.message : "Failed to export village summary report.");
		} finally {
			setExporting(null);
		}
	};

	return (
		<main className="space-y-5">
			<section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
				<h1 className="font-serif text-2xl font-semibold text-primary">Village Report Export</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Export village-level reports including AI review, allocation decisions, and reviewer attribution.
				</p>
			</section>

			<section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
				<div className="grid gap-3 md:grid-cols-6">
					<select
						aria-label="Select report program"
						className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
						value={filters.programId}
						onChange={(event) => setFilters((current) => ({ ...current, programId: event.target.value }))}
					>
						<option value="">All Programs</option>
						{programOptions.map((program) => (
							<option key={program.id} value={program.id}>{program.name}</option>
						))}
					</select>

					<select
						aria-label="Select report academic year"
						className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
						value={filters.academicYear}
						onChange={(event) => setFilters((current) => ({ ...current, academicYear: event.target.value }))}
					>
						<option value="">All Academic Years</option>
						{academicYearOptions.map((academicYear) => (
							<option key={academicYear} value={academicYear}>{academicYear}</option>
						))}
					</select>

					<select
						aria-label="Select report ward scope"
						className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
						value={filters.wardId}
						onChange={(event) => setFilters((current) => ({ ...current, wardId: event.target.value }))}
					>
						<option value="">All Wards</option>
						{wardOptions.map((ward) => (
							<option key={ward.id} value={ward.id}>{ward.name}</option>
						))}
					</select>

					<select
						aria-label="Select report village unit scope"
						className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
						value={filters.villageUnitId}
						onChange={(event) => setFilters((current) => ({ ...current, villageUnitId: event.target.value }))}
					>
						<option value="">All Village Units</option>
						{villageUnitOptions.map((villageUnit) => (
							<option key={villageUnit.id} value={villageUnit.id}>{villageUnit.name}</option>
						))}
					</select>

					<select
						aria-label="Select report education level"
						className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
						value={filters.educationLevel}
						onChange={(event) => setFilters((current) => ({ ...current, educationLevel: event.target.value }))}
					>
						<option value="">All Education Levels</option>
						<option value="UNIVERSITY">University</option>
						<option value="TVET">TVET</option>
						<option value="SECONDARY">Secondary</option>
					</select>

					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Button size="sm" onClick={() => void loadReport(filters)}>{isLoading ? "Loading..." : "Apply"}</Button>
						<span>Generated {formatShortDate(generatedAt ?? new Date().toISOString())}</span>
					</div>
				</div>

				{error ? (
					<p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
				) : null}

				<div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted px-3 py-3 text-sm text-foreground/90">
					<span className="font-medium text-primary">{totals.applications} applications</span>
					<span>{totals.approved} approved</span>
					<span>{totals.rejected} rejected</span>
					<span>Recommended {formatCurrencyKes(totals.recommendedKes)}</span>
					<span>Allocated {formatCurrencyKes(totals.allocatedKes)}</span>
					<span>Disbursed {formatCurrencyKes(totals.disbursedKes)}</span>
				</div>

				<div className="mt-4">
					<DataTable
						columns={villageReportColumns}
						data={rows}
						isLoading={isLoading}
						error={rows.length === 0 ? error : null}
						getRowId={(row) => row.applicationId}
						searchColumnId="applicantName"
						searchPlaceholder="Search applications…"
						initialSorting={[{ id: "reviewedAt", desc: true }]}
						initialColumnVisibility={{ reviewerStage: false, academicYear: false }}
						initialPageSize={10}
						toolbar={(
							<>
								<Button onClick={() => void exportReport("csv")} disabled={exporting !== null || isLoading}>
									{exporting === "csv" ? "Exporting CSV..." : "Download Excel (CSV)"}
								</Button>
								<Button variant="outline" onClick={() => void exportReport("pdf")} disabled={exporting !== null || isLoading}>
									{exporting === "pdf" ? "Exporting PDF..." : "Download PDF Summary"}
								</Button>
							</>
						)}
						emptyState="No village report rows match the current scope."
						renderSelectedActions={({ selectedRows }) => (
							<DataTableCsvExportButton
								selectedRows={selectedRows}
								columns={VILLAGE_SUMMARY_CSV_COLUMNS}
								filenamePrefix="village-summary-selection"
								itemNoun="application"
							/>
						)}
					/>
				</div>
			</section>
		</main>
	);
}
