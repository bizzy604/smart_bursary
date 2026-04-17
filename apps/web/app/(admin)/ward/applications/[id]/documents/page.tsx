"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DocumentViewer } from "@/components/application/document-viewer";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getAdminApplicationById } from "@/lib/admin-data";

export default function WardApplicationDocumentsPage() {
  const params = useParams<{ id: string }>();
  const application = getAdminApplicationById(params.id);

  if (!application) {
    return (
      <EmptyState
        title="Application not found"
        description="The requested application is not available for document review."
        action={
          <Link href="/ward/applications">
            <Button>Back to Ward Queue</Button>
          </Link>
        }
      />
    );
  }

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">Document Review • {application.reference}</h1>
        <p className="mt-1 text-sm text-gray-600">Verify all mandatory uploads before submitting a ward decision.</p>
        <div className="mt-3">
          <Link href={`/ward/applications/${application.id}`}>
            <Button variant="ghost" size="sm">Back to Application</Button>
          </Link>
        </div>
      </section>

      <DocumentViewer documents={application.documents} />
    </main>
  );
}
