export type ReviewQueueStatus =
  | "SUBMITTED"
  | "WARD_REVIEW"
  | "COUNTY_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WAITLISTED"
  | "DISBURSED";

export interface ReviewQueueItem {
  applicationId: string;
  reference: string;
  applicantName: string;
  wardName: string;
  programName: string;
  academicYear: string;
  educationLevel: string;
  status: ReviewQueueStatus;
  aiScore: number;
  wardRecommendationKes: number;
  countyAllocationKes: number;
  reviewerName: string;
  reviewerStage: string;
  reviewedAt: string | null;
}

export interface ScoreDimension {
  label: string;
  score: number;
  maxScore: number;
}

export interface ReviewScoreCard {
  score: number;
  grade: string;
  dimensions: ScoreDimension[];
  anomalyFlags: string[];
}

export interface ReviewTimelineEvent {
  id: string;
  label: string;
  note: string;
  date: string;
}

export interface ReviewNoteEntry {
  reviewId: string;
  stage: string;
  decision: string;
  note: string;
  recommendedAmount: number | null;
  allocatedAmount: number | null;
  reviewedAt: string;
  reviewerName: string;
}

export type SupportingDocumentStatus = "VERIFIED" | "PENDING_SCAN" | "MISSING";

export interface SupportingDocument {
  id: string;
  label: string;
  status: SupportingDocumentStatus;
}

export type WardReviewDecision = "RECOMMENDED" | "RETURNED" | "REJECTED";

export type CountyReviewDecision = "APPROVED" | "WAITLISTED" | "REJECTED";
