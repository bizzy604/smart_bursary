"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useApplication } from "@/hooks/use-application";
import {
  studentApplicationColumns,
  studentApplicationStatusOptions,
} from "../dashboard/columns";

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
        <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <DataTable
            columns={studentApplicationColumns}
            data={applications}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => row.id}
            searchColumnId="programName"
            searchPlaceholder="Search by program"
            facetedFilters={[
              { columnId: "status", title: "Status", options: studentApplicationStatusOptions },
            ]}
            initialSorting={[{ id: "updatedAt", desc: true }]}
            emptyState="No applications match your filters."
          />
        </section>
      )}
    </main>
  );
}
