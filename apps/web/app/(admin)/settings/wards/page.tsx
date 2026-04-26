"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrencyKes } from "@/lib/format";
import { fetchDashboardReport, fetchWardSummaryReport, type WardBreakdownRow } from "@/lib/reporting-api";

type WardCoverageRow = WardBreakdownRow & {
  pendingCountyReview: number;
  disbursedCount: number;
  averageAllocationKes: number;
};

export default function SettingsWardsPage() {
  const [rows, setRows] = useState<WardCoverageRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadWardCoverage = async () => {
      setIsLoading(true);
      try {
        const [dashboard, wardSummary] = await Promise.all([
          fetchDashboardReport(),
          fetchWardSummaryReport({}),
        ]);

        if (!mounted) {
          return;
        }

        const pendingByWard = new Map<string, number>();
        const disbursedByWard = new Map<string, number>();
        const totalAllocationByWard = new Map<string, number>();
        const allocationCountByWard = new Map<string, number>();

        for (const application of wardSummary.rows) {
          const ward = application.wardName;
          if (application.status === "COUNTY_REVIEW") {
            pendingByWard.set(ward, (pendingByWard.get(ward) ?? 0) + 1);
          }

          if (application.status === "DISBURSED") {
            disbursedByWard.set(ward, (disbursedByWard.get(ward) ?? 0) + 1);
          }

          if (application.countyAllocationKes > 0) {
            totalAllocationByWard.set(ward, (totalAllocationByWard.get(ward) ?? 0) + application.countyAllocationKes);
            allocationCountByWard.set(ward, (allocationCountByWard.get(ward) ?? 0) + 1);
          }
        }

        setRows(
          dashboard.ward_breakdown
            .map((row) => {
              const totalAllocation = totalAllocationByWard.get(row.ward_name) ?? 0;
              const allocationCount = allocationCountByWard.get(row.ward_name) ?? 0;
              return {
                ...row,
                pendingCountyReview: pendingByWard.get(row.ward_name) ?? 0,
                disbursedCount: disbursedByWard.get(row.ward_name) ?? 0,
                averageAllocationKes: allocationCount > 0 ? totalAllocation / allocationCount : 0,
              };
            })
            .sort((left, right) => right.applications - left.applications),
        );
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        setError(reason instanceof Error ? reason.message : "Failed to load ward coverage data.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWardCoverage();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return rows;
    }

    return rows.filter((row) => row.ward_name.toLowerCase().includes(normalizedTerm));
  }, [rows, searchTerm]);

  const totalWards = rows.length;
  const totalApplications = rows.reduce((sum, row) => sum + row.applications, 0);
  const totalApproved = rows.reduce((sum, row) => sum + row.approved, 0);
  const totalAllocatedKes = rows.reduce((sum, row) => sum + row.allocated_kes, 0);

  return (
    <main className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Wards Coverage and Allocation View</CardTitle>
          <CardDescription>
            Monitor county ward performance, pending county-stage workload, and allocation distribution.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Wards</CardDescription>
            <CardTitle>{totalWards}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Applications</CardDescription>
            <CardTitle>{totalApplications}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Approved Applications</CardDescription>
            <CardTitle>{totalApproved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Allocated</CardDescription>
            <CardTitle>{formatCurrencyKes(totalAllocatedKes)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ward Analytics</CardTitle>
          <CardDescription>Search and inspect operational coverage by ward.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            aria-label="Search wards"
            placeholder="Search ward by name"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading ward analytics...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wards matched your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Ward</th>
                    <th className="px-2 py-2">Applications</th>
                    <th className="px-2 py-2">Approved</th>
                    <th className="px-2 py-2">Pending County Review</th>
                    <th className="px-2 py-2">Disbursed</th>
                    <th className="px-2 py-2">Allocated</th>
                    <th className="px-2 py-2">Avg Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.ward_id} className="border-b border-border">
                      <td className="px-2 py-2 font-medium text-primary">{row.ward_name}</td>
                      <td className="px-2 py-2 text-foreground/90">{row.applications}</td>
                      <td className="px-2 py-2 text-foreground/90">{row.approved}</td>
                      <td className="px-2 py-2 text-foreground/90">{row.pendingCountyReview}</td>
                      <td className="px-2 py-2 text-foreground/90">{row.disbursedCount}</td>
                      <td className="px-2 py-2 text-foreground/90">{formatCurrencyKes(row.allocated_kes)}</td>
                      <td className="px-2 py-2 text-foreground/90">{formatCurrencyKes(row.averageAllocationKes)}</td>
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
