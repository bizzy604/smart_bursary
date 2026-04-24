import { apiRequestBlob, apiRequestJson } from "@/lib/api-client";

export interface DashboardProgramSummary {
  id: string;
  name: string;
  budget_ceiling: number;
  allocated_total: number;
  disbursed_total: number;
  utilization_pct: number;
  applications_by_status: Record<string, number>;
}

export interface WardBreakdownRow {
  ward_id: string;
  ward_name: string;
  applications: number;
  approved: number;
  allocated_kes: number;
}

export interface DashboardReportData {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  disbursedCount: number;
  approvalRate: number;
  as_of: string;
  programs: DashboardProgramSummary[];
  ward_breakdown: WardBreakdownRow[];
}

export interface OcobRow {
  programId: string;
  programName: string;
  academicYear: string;
  budgetCeilingKes: number;
  applications: number;
  approved: number;
  allocatedKes: number;
  disbursedKes: number;
  balanceKes: number;
}

export interface WardSummaryRow {
  applicationId: string;
  reference: string;
  applicantName: string;
  wardName: string;
  programName: string;
  academicYear: string;
  educationLevel: string;
  status: string;
  aiScore: number;
  wardRecommendationKes: number;
  countyAllocationKes: number;
  reviewerName: string;
  reviewerStage: string;
  reviewedAt: string | null;
}

export interface TrendRow {
  academicYear: string;
  totalApplications: number;
  approvedApplications: number;
  disbursedApplications: number;
  allocatedKes: number;
  disbursedKes: number;
}

type ReportScope = {
  programId?: string;
  wardId?: string;
  academicYear?: string;
  educationLevel?: string;
};

type TrendScope = ReportScope & {
  fromYear?: number;
  toYear?: number;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      query.set(key, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

async function requestJson<T>(path: string): Promise<T> {
  return apiRequestJson<T>(path, { method: "GET" });
}

async function requestFile(path: string): Promise<Blob> {
  return apiRequestBlob(path, { method: "GET" });
}

export async function fetchDashboardReport(): Promise<DashboardReportData> {
  const payload = await requestJson<{ data: DashboardReportData }>("/reports/dashboard");
  return payload.data;
}

export async function fetchOcobReport(scope: ReportScope): Promise<{ generatedAt: string; rows: OcobRow[] }> {
  const payload = await requestJson<{ data: { generatedAt: string; rows: OcobRow[] } }>(
    `/reports/ocob${buildQuery(scope)}`,
  );
  return payload.data;
}

export async function downloadOcobExport(scope: ReportScope, format: "csv" | "pdf"): Promise<Blob> {
  return requestFile(`/reports/ocob/export${buildQuery({ ...scope, format })}`);
}

export async function fetchWardSummaryReport(scope: ReportScope): Promise<{ generatedAt: string; rows: WardSummaryRow[] }> {
  const payload = await requestJson<{ data: { generatedAt: string; rows: WardSummaryRow[] } }>(
    `/reports/ward-summary${buildQuery(scope)}`,
  );
  return payload.data;
}

export async function downloadWardSummaryExport(scope: ReportScope, format: "csv" | "pdf"): Promise<Blob> {
  return requestFile(`/reports/ward-summary/export${buildQuery({ ...scope, format })}`);
}

export async function fetchTrendReport(scope: TrendScope): Promise<{ generatedAt: string; trends: TrendRow[] }> {
  const payload = await requestJson<{ data: { generatedAt: string; trends: TrendRow[] } }>(
    `/reports/trends${buildQuery(scope)}`,
  );
  return payload.data;
}
