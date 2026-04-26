"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchAdminSettings } from "@/lib/admin-settings";
import { formatShortDate } from "@/lib/format";
import { fetchWardSummaryReport } from "@/lib/reporting-api";

type ReviewerStage = "WARD_REVIEW" | "COUNTY_REVIEW";

type ReviewerRow = {
  key: string;
  fullName: string;
  stage: ReviewerStage;
  reviewedCount: number;
  lastActivity: string | null;
};

function normalizeStage(value: string): ReviewerStage {
  return value === "COUNTY_REVIEW" ? "COUNTY_REVIEW" : "WARD_REVIEW";
}

export default function SettingsUsersPage() {
  const [countyName, setCountyName] = useState("County");
  const [reviewers, setReviewers] = useState<ReviewerRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<"ALL" | ReviewerStage>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const [settings, wardSummary] = await Promise.all([
          fetchAdminSettings(),
          fetchWardSummaryReport({}),
        ]);

        if (!mounted) {
          return;
        }

        const reviewerMap = new Map<string, ReviewerRow>();
        for (const row of wardSummary.rows) {
          const stage = normalizeStage(row.reviewerStage);
          const reviewerName = row.reviewerName?.trim() || "Unassigned Reviewer";
          const key = `${stage}:${reviewerName}`;
          const existing = reviewerMap.get(key);

          if (!existing) {
            reviewerMap.set(key, {
              key,
              fullName: reviewerName,
              stage,
              reviewedCount: 1,
              lastActivity: row.reviewedAt,
            });
            continue;
          }

          existing.reviewedCount += 1;
          if (!existing.lastActivity || (row.reviewedAt && row.reviewedAt > existing.lastActivity)) {
            existing.lastActivity = row.reviewedAt;
          }
        }

        setCountyName(settings.branding.countyName);
        setReviewers(
          [...reviewerMap.values()].sort((left, right) => right.reviewedCount - left.reviewedCount),
        );
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        setError(reason instanceof Error ? reason.message : "Failed to load county users.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredReviewers = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return reviewers.filter((reviewer) => {
      if (stageFilter !== "ALL" && reviewer.stage !== stageFilter) {
        return false;
      }

      if (!normalizedTerm) {
        return true;
      }

      return reviewer.fullName.toLowerCase().includes(normalizedTerm);
    });
  }, [reviewers, searchTerm, stageFilter]);

  const wardUsers = reviewers.filter((reviewer) => reviewer.stage === "WARD_REVIEW").length;
  const countyUsers = reviewers.filter((reviewer) => reviewer.stage === "COUNTY_REVIEW").length;
  const totalReviews = reviewers.reduce((sum, reviewer) => sum + reviewer.reviewedCount, 0);

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Users and Review Workforce</CardTitle>
          <CardDescription>
            County-scoped reviewer activity for {countyName} based on live ward and county workflow telemetry.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Active Reviewers</CardDescription>
            <CardTitle>{reviewers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ward Review Users</CardDescription>
            <CardTitle>{wardUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>County Review Users</CardDescription>
            <CardTitle>{countyUsers}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Reviewer Directory</CardTitle>
          <CardDescription>{totalReviews} review actions recorded in the current analytics window.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              aria-label="Search reviewers"
              placeholder="Search by reviewer name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              aria-label="Filter reviewers by stage"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value as "ALL" | ReviewerStage)}
              className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground/90"
            >
              <option value="ALL">All Stages</option>
              <option value="WARD_REVIEW">Ward Review</option>
              <option value="COUNTY_REVIEW">County Review</option>
            </select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reviewer directory...</p>
          ) : filteredReviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviewers found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Stage</th>
                    <th className="px-2 py-2">Reviews</th>
                    <th className="px-2 py-2">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviewers.map((reviewer) => (
                    <tr key={reviewer.key} className="border-b border-border">
                      <td className="px-2 py-2 font-medium text-primary">{reviewer.fullName}</td>
                      <td className="px-2 py-2 text-foreground/90">
                        {reviewer.stage === "COUNTY_REVIEW" ? "County Review" : "Ward Review"}
                      </td>
                      <td className="px-2 py-2 text-foreground/90">{reviewer.reviewedCount}</td>
                      <td className="px-2 py-2 text-foreground/90">
                        {reviewer.lastActivity ? formatShortDate(reviewer.lastActivity) : "Not available"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
