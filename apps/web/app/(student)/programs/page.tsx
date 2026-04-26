"use client";

import { useMemo } from "react";
import { GraduationCap } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { DataTableCsvExportButton } from "@/components/shared/data-table-csv-export-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useApplication } from "@/hooks/use-application";
import { type SpreadsheetColumn } from "@/lib/csv-export";
import type { StudentProgramSummary } from "@/lib/student-types";
import { buildStudentProgramColumns } from "./columns";

const STUDENT_PROGRAM_CSV_COLUMNS: SpreadsheetColumn<StudentProgramSummary>[] = [
  { header: "Program", value: (row) => row.name, width: 36 },
  { header: "Ward", value: (row) => row.ward, width: 18 },
  { header: "Closes At", value: (row) => row.closesAt, type: "date", width: 14 },
  { header: "Budget Ceiling (KES)", value: (row) => row.budgetCeilingKes, type: "currency", width: 20 },
  { header: "Allocated (KES)", value: (row) => row.allocatedKes, type: "currency", width: 18 },
  {
    header: "Utilization (%)",
    value: (row) =>
      row.budgetCeilingKes > 0
        ? Math.round((row.allocatedKes / row.budgetCeilingKes) * 100)
        : 0,
    type: "percent",
    width: 14,
  },
  { header: "Summary", value: (row) => row.summary, width: 48 },
];

export default function ProgramsPage() {
  const { programs, isLoading, error } = useApplication();
  const wardOptions = useMemo(() => {
    const values = Array.from(new Set(programs.map((program) => program.ward))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [programs]);

  const columns = useMemo(
    () => buildStudentProgramColumns({ wardOptions }),
    [wardOptions],
  );

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Bursary catalogue"
        title="Eligible Programs"
        description="These programs match your current profile and ward scope. Open one to review details before applying."
        icon={GraduationCap}
      />

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
        <DataTable
          columns={columns}
          data={programs}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.id}
          searchColumnId="name"
          searchPlaceholder="Search programs…"
          initialSorting={[{ id: "closesAt", desc: false }]}
          initialPageSize={10}
          emptyState={(
            <EmptyState
              title="No eligible programs"
              description="There are no open programs matching your current profile at the moment."
            />
          )}
          renderSelectedActions={({ selectedRows }) => (
            <DataTableCsvExportButton
              selectedRows={selectedRows}
              columns={STUDENT_PROGRAM_CSV_COLUMNS}
              filenamePrefix="eligible-programs"
              itemNoun="program"
            />
          )}
        />
      </section>
    </main>
  );
}
