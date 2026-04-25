"use client";

import { useMemo } from "react";
import { GraduationCap } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useApplication } from "@/hooks/use-application";
import { buildStudentProgramColumns } from "./columns";

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
        />
      </section>
    </main>
  );
}
