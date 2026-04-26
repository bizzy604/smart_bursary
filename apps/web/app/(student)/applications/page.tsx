"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { DataTableCsvExportButton } from "@/components/shared/data-table-csv-export-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useApplication } from "@/hooks/use-application";
import { type SpreadsheetColumn } from "@/lib/csv-export";
import type { StudentApplicationSummary } from "@/lib/student-types";
import { studentApplicationColumns } from "../dashboard/columns";

const STUDENT_APPLICATION_CSV_COLUMNS: SpreadsheetColumn<StudentApplicationSummary>[] = [
  { header: "Reference", value: (row) => row.reference, width: 20 },
  { header: "Program", value: (row) => row.programName, width: 32 },
  { header: "Status", value: (row) => row.status, width: 16 },
  { header: "Requested (KES)", value: (row) => row.requestedKes, type: "currency", width: 18 },
  { header: "Submitted At", value: (row) => row.submittedAt, type: "date", width: 14 },
  { header: "Updated At", value: (row) => row.updatedAt, type: "date", width: 14 },
];

export default function ApplicationsPage() {
  const { applications, isLoading, error } = useApplication();

  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="My applications"
        title="Application timeline"
        description="Review status, open details, and download your submitted bursary forms."
        icon={FileText}
      />

      {applications.length === 0 && !isLoading ? (
        <EmptyState
          tone="brand"
          icon={FileText}
          title="No applications yet"
          description="You haven't started a bursary application. Browse open programs to begin."
          action={
            <Link href="/programs">
              <Button>Find Open Programs</Button>
            </Link>
          }
        />
      ) : (
        <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
          <DataTable
            columns={studentApplicationColumns}
            data={applications}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => row.id}
            searchColumnId="programName"
            searchPlaceholder="Search applications…"
            initialSorting={[{ id: "updatedAt", desc: true }]}
            emptyState="No applications match your filters."
            renderSelectedActions={({ selectedRows }) => (
              <DataTableCsvExportButton
                selectedRows={selectedRows}
                columns={STUDENT_APPLICATION_CSV_COLUMNS}
                filenamePrefix="my-applications"
                itemNoun="application"
              />
            )}
          />
        </section>
      )}
    </main>
  );
}
