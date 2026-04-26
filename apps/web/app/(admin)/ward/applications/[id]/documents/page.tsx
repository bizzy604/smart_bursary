"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DocumentViewer } from "@/components/application/document-viewer";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  fetchReviewDocuments,
  fetchWorkflowApplicationById,
} from "@/lib/review-workflow-api";
import type { ReviewQueueItem, SupportingDocument } from "@/lib/review-types";

export default function WardApplicationDocumentsPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<ReviewQueueItem | null>(null);
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        const [summary, docs] = await Promise.all([
          fetchWorkflowApplicationById(params.id),
          fetchReviewDocuments(params.id),
        ]);

        if (!mounted) {
          return;
        }

        setApplication(summary);
        setDocuments(docs);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load supporting documents.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground shadow-xs">
        Loading documents...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </section>
    );
  }

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
      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <h1 className="font-serif text-2xl font-semibold text-primary">Document Review • {application.reference}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verify all mandatory uploads before submitting a ward decision.</p>
        <div className="mt-3">
          <Link href={`/ward/applications/${application.applicationId}`}>
            <Button variant="ghost" size="sm">Back to Application</Button>
          </Link>
        </div>
      </section>

      <DocumentViewer documents={documents} />
    </main>
  );
}
