import { apiRequestBlob, apiRequestJson } from "@/lib/api-client";
import {
  fetchWardSummaryReport,
  type WardSummaryRow,
} from "@/lib/reporting-api";
import type {
  CountyReviewDecision,
  ReviewNoteEntry,
  ReviewQueueItem,
  ReviewQueueStatus,
  ReviewScoreCard,
  ReviewTimelineEvent,
  SupportingDocument,
  WardReviewDecision,
} from "@/lib/review-types";

type TimelineApiRow = {
  id: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: unknown;
  occurredAt: string;
};

type ReviewNotesApiRow = {
  reviewId: string;
  stage: string;
  decision: string;
  note: string | null;
  recommendedAmount: number | null;
  allocatedAmount: number | null;
  reviewedAt: string;
  reviewer?: {
    fullName?: string | null;
    email?: string;
  };
};

type ScoreDimensionApiRow = {
  score?: number;
  max?: number;
};

type ScoreCardApiPayload = {
  totalScore?: number;
  grade?: string;
  dimensions?: Record<string, ScoreDimensionApiRow>;
  anomalyFlags?: unknown;
};

type DocumentApiRow = {
  id: string;
  docType?: string | null;
  originalName?: string | null;
  scanStatus?: "PENDING" | "CLEAN" | "INFECTED" | "FAILED";
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequestJson<T>(path, init);
}

async function requestBlob(path: string, init: RequestInit): Promise<Blob> {
  return apiRequestBlob(path, init);
}

function mapQueueRow(row: WardSummaryRow): ReviewQueueItem {
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

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/[_\s]+/g)
    .map((word) => (word.length > 0 ? `${word[0]?.toUpperCase()}${word.slice(1)}` : ""))
    .join(" ")
    .trim();
}

function toTimelineLabel(eventType: string): string {
  return toTitleCase(eventType);
}

function toTimelineNote(row: TimelineApiRow): string {
  if (row.metadata && typeof row.metadata === "object") {
    const metadata = row.metadata as Record<string, unknown>;
    if (typeof metadata.note === "string" && metadata.note.length > 0) {
      return metadata.note;
    }
    if (typeof metadata.message === "string" && metadata.message.length > 0) {
      return metadata.message;
    }
  }

  const from = typeof row.fromStatus === "string" ? row.fromStatus : "unknown";
  const to = typeof row.toStatus === "string" ? row.toStatus : "unknown";
  return `Status changed from ${from} to ${to}.`;
}

function toScoreGrade(value: string | undefined): string {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "HIGH") {
    return "HIGH NEED";
  }
  if (normalized === "MEDIUM") {
    return "MODERATE NEED";
  }
  if (normalized === "LOW") {
    return "LOW NEED";
  }

  return normalized.length > 0 ? normalized : "REVIEW REQUIRED";
}

function toDimensionLabel(key: string): string {
  const labels: Record<string, string> = {
    family_status: "Family Status",
    family_income: "Family Income",
    education_burden: "Education Burden",
    academic_standing: "Academic Standing",
    document_quality: "Document Quality",
    integrity: "Integrity",
  };

  return labels[key] ?? toTitleCase(key);
}

function toDocumentStatus(scanStatus: DocumentApiRow["scanStatus"]): SupportingDocument["status"] {
  if (scanStatus === "CLEAN") {
    return "VERIFIED";
  }
  if (scanStatus === "PENDING") {
    return "PENDING_SCAN";
  }
  return "MISSING";
}

export async function fetchWorkflowQueueByStatus(
  status: ReviewQueueStatus,
): Promise<ReviewQueueItem[]> {
  const report = await fetchWardSummaryReport({});

  return report.rows
    .filter((row) => row.status === status)
    .map(mapQueueRow)
    .sort((left, right) => right.aiScore - left.aiScore);
}

export async function fetchWorkflowApplicationById(
  applicationId: string,
): Promise<ReviewQueueItem | null> {
  const report = await fetchWardSummaryReport({});
  const row = report.rows.find((entry) => entry.applicationId === applicationId);
  return row ? mapQueueRow(row) : null;
}

export async function fetchReviewScoreCard(applicationId: string): Promise<ReviewScoreCard> {
  const payload = await requestJson<unknown>(`/applications/${applicationId}/score`);
  const score = unwrapData<ScoreCardApiPayload>(payload);

  const dimensions = Object.entries(score.dimensions ?? {}).map(([key, value]) => ({
    label: toDimensionLabel(key),
    score: Number(value?.score ?? 0),
    maxScore: Number(value?.max ?? 0),
  }));

  const anomalyFlags = Array.isArray(score.anomalyFlags)
    ? score.anomalyFlags
      .filter((flag): flag is string => typeof flag === "string")
    : [];

  return {
    score: Number(score.totalScore ?? 0),
    grade: toScoreGrade(score.grade),
    dimensions,
    anomalyFlags,
  };
}

export async function fetchReviewTimeline(
  applicationId: string,
): Promise<ReviewTimelineEvent[]> {
  const payload = await requestJson<unknown>(`/applications/${applicationId}/timeline`);
  const rows = unwrapData<TimelineApiRow[]>(payload);

  return (rows ?? []).map((row) => ({
    id: row.id,
    label: toTimelineLabel(row.eventType),
    note: toTimelineNote(row),
    date: row.occurredAt,
  }));
}

export async function fetchReviewNotes(applicationId: string): Promise<ReviewNoteEntry[]> {
  const payload = await requestJson<unknown>(`/applications/${applicationId}/review-notes`);
  const rows = unwrapData<ReviewNotesApiRow[]>(payload);

  return (rows ?? []).map((row) => ({
    reviewId: row.reviewId,
    stage: row.stage,
    decision: row.decision,
    note: row.note ?? "",
    recommendedAmount: row.recommendedAmount,
    allocatedAmount: row.allocatedAmount,
    reviewedAt: row.reviewedAt,
    reviewerName: row.reviewer?.fullName ?? row.reviewer?.email ?? "Unknown reviewer",
  }));
}

export async function submitWardReview(
  applicationId: string,
  decision: WardReviewDecision,
  recommendedAmount: number,
  note: string,
): Promise<void> {
  await requestJson(`/applications/${applicationId}/review/ward`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      ...(decision === "RECOMMENDED" ? { recommendedAmount } : {}),
      ...(note.trim().length > 0 ? { note: note.trim() } : {}),
    }),
  });
}

export async function submitCountyReview(
  applicationId: string,
  decision: CountyReviewDecision,
  allocatedAmount: number,
  note: string,
): Promise<void> {
  await requestJson(`/applications/${applicationId}/review/county`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      ...(decision === "APPROVED" ? { allocatedAmount } : {}),
      ...(note.trim().length > 0 ? { note: note.trim() } : {}),
    }),
  });
}

export async function fetchReviewDocuments(applicationId: string): Promise<SupportingDocument[]> {
  const payload = await requestJson<unknown>(`/documents/application/${applicationId}`);
  const rows = unwrapData<DocumentApiRow[]>(payload);

  return (rows ?? []).map((document) => ({
    id: document.id,
    label: document.originalName ?? toTitleCase(document.docType ?? "Supporting Document"),
    status: toDocumentStatus(document.scanStatus),
  }));
}

export async function initiateDisbursement(applicationId: string): Promise<void> {
  await requestJson(`/disbursements`, {
    method: "POST",
    body: JSON.stringify({
      applicationId,
      disbursementMethod: "MPESA_B2C",
    }),
  });
}

export async function exportEftBatch(applicationIds: string[]): Promise<Blob> {
  return requestBlob("/disbursements/batch/eft", {
    method: "POST",
    body: JSON.stringify({
      applicationIds,
      batchName: `county-eft-${new Date().toISOString().slice(0, 10)}`,
    }),
  });
}
