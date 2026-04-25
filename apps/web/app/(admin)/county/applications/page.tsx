"use client";

import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import {
  buildReviewQueueColumns,
  reviewQueueStatusOptions,
} from "@/components/shared/review-queue-columns";
import { fetchWardSummaryReport } from "@/lib/reporting-api";
import { useAuthStore } from "@/store/auth-store";
import type { ReviewQueueItem, ReviewQueueStatus } from "@/lib/review-types";

type WardSummaryReportRow = Awaited<ReturnType<typeof fetchWardSummaryReport>>["rows"][number];

function mapReportRow(row: WardSummaryReportRow): ReviewQueueItem {
  return {
    applicationId: row.applicationId,
    reference: row.reference,
    applicantName: row.applicantName,
    wardName: row.wardName,
    programName: row.programName,
    academicYear: row.academicYear,
    educationLevel: row.educationLevel,
    status: row.status as ReviewQueueStatus,
    aiScore: row.aiScore,
    wardRecommendationKes: row.wardRecommendationKes,
    countyAllocationKes: row.countyAllocationKes,
    reviewerName: row.reviewerName,
    reviewerStage: row.reviewerStage,
    reviewedAt: row.reviewedAt,
  };
}

export default function CountyApplicationsPage() {
  const userRole = useAuthStore((state) => state.user?.role);
  const [applications, setApplications] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadApplications = async () => {
      setIsLoading(true);
      try {
        const report = await fetchWardSummaryReport({});
        if (!mounted) {
          return;
        }

        const rows = report.rows
          .map(mapReportRow)
          .sort((left, right) => {
            const leftReviewedAt = left.reviewedAt ? new Date(left.reviewedAt).getTime() : 0;
            const rightReviewedAt = right.reviewedAt ? new Date(right.reviewedAt).getTime() : 0;

            if (rightReviewedAt !== leftReviewedAt) {
              return rightReviewedAt - leftReviewedAt;
            }

            return right.aiScore - left.aiScore;
          });

        setApplications(rows);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message = reason instanceof Error ? reason.message : "Failed to load county applications.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadApplications();

    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo(() => {
    const menuActions =
      userRole === "FINANCE_OFFICER"
        ? [
            {
              label: "Open county review",
              href: (item: ReviewQueueItem) => `/county/review/${item.applicationId}` as Route,
            },
          ]
        : [];

    return buildReviewQueueColumns({
      columns: [
        "reference",
        "applicantName",
        "wardName",
        "programName",
        "educationLevel",
        "aiScore",
        "wardRecommendationKes",
        "countyAllocationKes",
        "status",
        "reviewedAt",
      ],
      primaryAction: {
        label: "View Details",
        href: (item) => `/county/applications/${item.applicationId}` as Route,
      },
      menuActions,
    });
  }, [userRole]);

  const wardFilterOptions = useMemo(() => {
    const values = Array.from(new Set(applications.map((item) => item.wardName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [applications]);

  const programOptions = useMemo(() => {
    const values = Array.from(new Set(applications.map((item) => item.programName))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [applications]);

  const educationLevelOptions = useMemo(() => {
    const values = Array.from(new Set(applications.map((item) => item.educationLevel))).filter(Boolean);
    return values.map((value) => ({ label: value, value }));
  }, [applications]);

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">County Applications</h1>
        <p className="mt-1 text-sm text-gray-600">
          Inspect all county-scoped applications, review status progression, and open each record in a dedicated detail view.
        </p>
      </section>

      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <DataTable
          columns={columns}
          data={applications}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.applicationId}
          searchColumnId="applicantName"
          searchPlaceholder="Search by applicant"
          facetedFilters={[
            ...(wardFilterOptions.length > 0
              ? [{ columnId: "wardName", title: "Ward", options: wardFilterOptions }]
              : []),
            ...(programOptions.length > 0
              ? [{ columnId: "programName", title: "Program", options: programOptions }]
              : []),
            ...(educationLevelOptions.length > 0
              ? [{ columnId: "educationLevel", title: "Level", options: educationLevelOptions }]
              : []),
            { columnId: "status", title: "Status", options: reviewQueueStatusOptions },
          ]}
          initialSorting={[{ id: "reviewedAt", desc: true }]}
          initialPageSize={10}
          emptyState="No county applications are available yet."
        />
      </section>
    </main>
  );
}
