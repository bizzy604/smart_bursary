"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
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
      <section className="rounded-2xl border border-brand-100 bg-white p-6 shadow-xs">
        <h1 className="font-display text-2xl font-bold text-brand-900">My Applications</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review status, open details, and download your submitted bursary forms.
        </p>
      </section>

      {applications.length === 0 && !isLoading ? (
        <EmptyState
          title="No applications available"
          description="You have not started any bursary application yet."
          action={
            <Link href="/programs">
              <Button>Find Open Programs</Button>
            </Link>
          }
        />
      ) : (
        <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
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
