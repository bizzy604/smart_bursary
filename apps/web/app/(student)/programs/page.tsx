"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useApplication } from "@/hooks/use-application";
import { studentProgramColumns } from "./columns";

export default function ProgramsPage() {
	const { programs, isLoading, error } = useApplication();
  const wardOptions = useMemo(() => {
    const values = Array.from(new Set(programs.map((program) => program.ward))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [programs]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">Eligible Programs</h1>
        <p className="mt-2 text-sm text-gray-600">
          These programs match your current profile and ward scope. Open one to review details before applying.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <DataTable
          columns={studentProgramColumns}
          data={programs}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.id}
          searchColumnId="name"
          searchPlaceholder="Search program"
          facetedFilters={[
            ...(wardOptions.length > 0
              ? [{ columnId: "ward", title: "Ward Scope", options: wardOptions }]
              : []),
          ]}
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
