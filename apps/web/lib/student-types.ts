export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "WARD_REVIEW"
  | "COUNTY_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WAITLISTED"
  | "DISBURSED"
  | "WITHDRAWN";

export type TimelineState = "complete" | "current" | "upcoming";

export type SectionKey =
  | "section-a"
  | "section-b"
  | "section-c"
  | "section-d"
  | "section-e"
  | "section-f";

export interface StudentProgramSummary {
  id: string;
  name: string;
  ward: string;
  closesAt: string;
  budgetCeilingKes: number;
  allocatedKes: number;
  summary: string;
  eligibilityNotes: string[];
}

export interface StudentApplicationSummary {
  id: string;
  reference: string;
  programId: string;
  programName: string;
  status: ApplicationStatus;
  requestedKes: number;
  submittedAt: string;
  updatedAt: string;
}

export interface ApplicationSectionSnapshot {
  sectionKey: SectionKey;
  data: Record<string, unknown>;
  isComplete: boolean;
  savedAt: string;
}

export interface StudentApplicationDetail extends StudentApplicationSummary {
  totalFeeKes: number;
  outstandingKes: number;
  reasonForSupport: string;
  sections: ApplicationSectionSnapshot[];
}

export interface TimelineEvent {
  label: string;
  status: TimelineState;
  date: string;
  note: string;
}

export interface StudentProfileSnapshot {
  fullName: string;
  email: string;
  phone: string;
  county: string;
  ward: string;
  institution: string;
  course: string;
  yearOfStudy: string;
  familyStatus: string;
  siblingsInSchool: number;
  guardianIncomeKes: number;
}