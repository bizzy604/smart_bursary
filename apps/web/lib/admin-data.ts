import type { ApplicationStatus, TimelineEvent } from "@/lib/student-data";

export interface ScoreDimension {
  label: string;
  score: number;
  maxScore: number;
}

export interface SupportingDocument {
  id: string;
  label: string;
  status: "VERIFIED" | "PENDING_SCAN" | "MISSING";
}

export interface AdminApplication {
  id: string;
  reference: string;
  applicantName: string;
  ward: string;
  subCounty: string;
  programName: string;
  institution: string;
  educationLevel: string;
  yearOfStudy: string;
  course: string;
  admissionNumber: string;
  familyStatus: string;
  guardianIncomeKes: number;
  siblingsInSchool: number;
  hasDisability: boolean;
  status: ApplicationStatus;
  requestedKes: number;
  totalFeesKes: number;
  outstandingKes: number;
  canPayKes: number;
  aiScore: number;
  scoreGrade: "CRITICAL NEED" | "HIGH NEED" | "MODERATE NEED" | "LOW NEED" | "REVIEW REQUIRED";
  anomalies: string[];
  submittedAt: string;
  reviewedAt: string;
  wardRecommendationKes?: number;
  countyAllocationKes?: number;
  reviewNote?: string;
  documents: SupportingDocument[];
  dimensions: ScoreDimension[];
  timeline: TimelineEvent[];
}

export interface CountyBudgetSnapshot {
  programName: string;
  ceilingKes: number;
  allocatedKes: number;
  disbursedKes: number;
}

export const wardAdminProfile = {
  name: "Elijah Lokwang",
  role: "Ward Administrator",
  ward: "Kalokol Ward",
};

export const countyFinanceProfile = {
  name: "Faith Akeno",
  role: "Finance Officer",
};

export const countyBudgetSnapshot: CountyBudgetSnapshot = {
  programName: "2026 Ward Bursary Programme",
  ceilingKes: 5000000,
  allocatedKes: 2150000,
  disbursedKes: 1800000,
};

function timelineFor(status: ApplicationStatus, submittedAt: string, reviewedAt: string): TimelineEvent[] {
  return [
    {
      label: "Application Created",
      status: "complete",
      date: submittedAt,
      note: "Student completed personal and academic profile sections.",
    },
    {
      label: "Submitted",
      status: "complete",
      date: submittedAt,
      note: "Application and supporting documents were submitted.",
    },
    {
      label: "AI Scoring Complete",
      status: "complete",
      date: submittedAt,
      note: "Automated scoring generated a ranked recommendation.",
    },
    {
      label: "Ward Review",
      status: status === "WARD_REVIEW" ? "current" : "complete",
      date: reviewedAt,
      note: "Ward committee validates details and recommends amount.",
    },
    {
      label: "County Review",
      status:
        status === "COUNTY_REVIEW"
          ? "current"
          : status === "APPROVED" || status === "DISBURSED" || status === "REJECTED" || status === "WAITLISTED"
            ? "complete"
            : "upcoming",
      date: status === "COUNTY_REVIEW" || status === "APPROVED" || status === "DISBURSED" ? reviewedAt : "Pending",
      note: "County finance team confirms final allocation.",
    },
    {
      label: "Disbursement",
      status: status === "DISBURSED" ? "complete" : status === "APPROVED" ? "current" : "upcoming",
      date: status === "DISBURSED" ? reviewedAt : "Pending",
      note: "Approved allocations move to payment processing.",
    },
  ];
}

export const adminApplications: AdminApplication[] = [
  {
    id: "app-00142",
    reference: "TRK-2026-00142",
    applicantName: "Aisha Lokiru",
    ward: "Kalokol",
    subCounty: "Turkana Central",
    programName: "2026 Ward Bursary Programme",
    institution: "University of Nairobi",
    educationLevel: "University",
    yearOfStudy: "Year 2",
    course: "Bachelor of Education",
    admissionNumber: "F56/1234/2023",
    familyStatus: "Single Parent - Mother",
    guardianIncomeKes: 18000,
    siblingsInSchool: 2,
    hasDisability: false,
    status: "WARD_REVIEW",
    requestedKes: 45000,
    totalFeesKes: 75000,
    outstandingKes: 60000,
    canPayKes: 15000,
    aiScore: 78.5,
    scoreGrade: "HIGH NEED",
    anomalies: [],
    submittedAt: "2026-04-10T11:22:00Z",
    reviewedAt: "2026-04-12T09:18:00Z",
    wardRecommendationKes: 40000,
    reviewNote: "Strong need profile and complete supporting documents.",
    documents: [
      { id: "doc-fee", label: "Fee Structure", status: "VERIFIED" },
      { id: "doc-adm", label: "Admission Letter", status: "VERIFIED" },
      { id: "doc-trans", label: "Transcript", status: "VERIFIED" },
      { id: "doc-id", label: "School ID", status: "PENDING_SCAN" },
    ],
    dimensions: [
      { label: "Family Status", score: 25, maxScore: 25 },
      { label: "Family Income", score: 20, maxScore: 25 },
      { label: "Education Burden", score: 15, maxScore: 20 },
      { label: "Academic Standing", score: 10.5, maxScore: 15 },
      { label: "Document Quality", score: 8, maxScore: 10 },
      { label: "Integrity", score: 0, maxScore: 5 },
    ],
    timeline: timelineFor("WARD_REVIEW", "2026-04-10T11:22:00Z", "2026-04-12T09:18:00Z"),
  },
  {
    id: "app-00170",
    reference: "TRK-2026-00170",
    applicantName: "John Ekal",
    ward: "Nadapal",
    subCounty: "Turkana North",
    programName: "2026 Ward Bursary Programme",
    institution: "Lodwar Technical Institute",
    educationLevel: "TVET",
    yearOfStudy: "Year 1",
    course: "Electrical Installation",
    admissionNumber: "TV/7762/2026",
    familyStatus: "Orphan",
    guardianIncomeKes: 0,
    siblingsInSchool: 3,
    hasDisability: false,
    status: "COUNTY_REVIEW",
    requestedKes: 60000,
    totalFeesKes: 98000,
    outstandingKes: 70000,
    canPayKes: 10000,
    aiScore: 85.2,
    scoreGrade: "CRITICAL NEED",
    anomalies: [],
    submittedAt: "2026-04-08T07:40:00Z",
    reviewedAt: "2026-04-13T12:00:00Z",
    wardRecommendationKes: 55000,
    reviewNote: "Ward recommends fast-tracking due to vulnerability profile.",
    documents: [
      { id: "doc-fee", label: "Fee Structure", status: "VERIFIED" },
      { id: "doc-adm", label: "Admission Letter", status: "VERIFIED" },
      { id: "doc-death", label: "Death Certificate", status: "VERIFIED" },
      { id: "doc-id", label: "Student ID", status: "VERIFIED" },
    ],
    dimensions: [
      { label: "Family Status", score: 25, maxScore: 25 },
      { label: "Family Income", score: 24, maxScore: 25 },
      { label: "Education Burden", score: 16, maxScore: 20 },
      { label: "Academic Standing", score: 11.2, maxScore: 15 },
      { label: "Document Quality", score: 9, maxScore: 10 },
      { label: "Integrity", score: 0, maxScore: 5 },
    ],
    timeline: timelineFor("COUNTY_REVIEW", "2026-04-08T07:40:00Z", "2026-04-13T12:00:00Z"),
  },
  {
    id: "app-00191",
    reference: "TRK-2026-00191",
    applicantName: "Maria Naserian",
    ward: "Lokichar",
    subCounty: "Turkana South",
    programName: "2026 Ward Bursary Programme",
    institution: "Moi University",
    educationLevel: "University",
    yearOfStudy: "Year 3",
    course: "BSc Nursing",
    admissionNumber: "MU/3434/2024",
    familyStatus: "Single Parent",
    guardianIncomeKes: 22000,
    siblingsInSchool: 1,
    hasDisability: false,
    status: "APPROVED",
    requestedKes: 50000,
    totalFeesKes: 82000,
    outstandingKes: 52000,
    canPayKes: 10000,
    aiScore: 67.9,
    scoreGrade: "HIGH NEED",
    anomalies: ["Household income declaration changed between profile updates"],
    submittedAt: "2026-04-07T09:22:00Z",
    reviewedAt: "2026-04-14T10:30:00Z",
    wardRecommendationKes: 42000,
    countyAllocationKes: 40000,
    reviewNote: "Approved with adjusted amount aligned to county cap.",
    documents: [
      { id: "doc-fee", label: "Fee Structure", status: "VERIFIED" },
      { id: "doc-adm", label: "Admission Letter", status: "VERIFIED" },
      { id: "doc-trans", label: "Transcript", status: "VERIFIED" },
    ],
    dimensions: [
      { label: "Family Status", score: 20, maxScore: 25 },
      { label: "Family Income", score: 16, maxScore: 25 },
      { label: "Education Burden", score: 14, maxScore: 20 },
      { label: "Academic Standing", score: 11.9, maxScore: 15 },
      { label: "Document Quality", score: 6, maxScore: 10 },
      { label: "Integrity", score: 0, maxScore: 5 },
    ],
    timeline: timelineFor("APPROVED", "2026-04-07T09:22:00Z", "2026-04-14T10:30:00Z"),
  },
  {
    id: "app-00103",
    reference: "TRK-2026-00103",
    applicantName: "Paul Ekiru",
    ward: "Kalokol",
    subCounty: "Turkana Central",
    programName: "2026 Ward Bursary Programme",
    institution: "St. Luke Secondary",
    educationLevel: "Secondary",
    yearOfStudy: "Form 3",
    course: "N/A",
    admissionNumber: "SLS/9201/2025",
    familyStatus: "Both Parents Alive",
    guardianIncomeKes: 36000,
    siblingsInSchool: 2,
    hasDisability: false,
    status: "DISBURSED",
    requestedKes: 30000,
    totalFeesKes: 45000,
    outstandingKes: 28000,
    canPayKes: 17000,
    aiScore: 49.1,
    scoreGrade: "MODERATE NEED",
    anomalies: [],
    submittedAt: "2026-04-05T14:15:00Z",
    reviewedAt: "2026-04-15T08:45:00Z",
    wardRecommendationKes: 25000,
    countyAllocationKes: 25000,
    reviewNote: "Disbursed via county EFT batch #TRK-BATCH-27.",
    documents: [
      { id: "doc-fee", label: "Fee Structure", status: "VERIFIED" },
      { id: "doc-adm", label: "Admission Letter", status: "VERIFIED" },
    ],
    dimensions: [
      { label: "Family Status", score: 10, maxScore: 25 },
      { label: "Family Income", score: 12, maxScore: 25 },
      { label: "Education Burden", score: 11, maxScore: 20 },
      { label: "Academic Standing", score: 10.1, maxScore: 15 },
      { label: "Document Quality", score: 6, maxScore: 10 },
      { label: "Integrity", score: 0, maxScore: 5 },
    ],
    timeline: timelineFor("DISBURSED", "2026-04-05T14:15:00Z", "2026-04-15T08:45:00Z"),
  },
];

export function getAdminApplicationById(applicationId: string): AdminApplication | null {
  return adminApplications.find((application) => application.id === applicationId) ?? null;
}

export function getWardQueue(): AdminApplication[] {
  return adminApplications.filter((application) => application.status === "WARD_REVIEW");
}

export function getCountyReviewQueue(): AdminApplication[] {
  return adminApplications.filter((application) => application.status === "COUNTY_REVIEW");
}

export function getDisbursementQueue(): AdminApplication[] {
  return adminApplications.filter((application) => application.status === "APPROVED");
}

export function getWardDashboardStats() {
  const pending = getWardQueue().length;
  const reviewedToday = 5;
  const rejected = adminApplications.filter((application) => application.status === "REJECTED").length;
  const recommendedKes = adminApplications.reduce((sum, application) => {
    return sum + (application.wardRecommendationKes ?? 0);
  }, 0);

  return { pending, reviewedToday, rejected, recommendedKes };
}

export function getCountyDashboardStats() {
  const approved = adminApplications.filter((application) => application.status === "APPROVED" || application.status === "DISBURSED").length;
  const allocatedKes = countyBudgetSnapshot.allocatedKes;
  const remainingKes = countyBudgetSnapshot.ceilingKes - countyBudgetSnapshot.allocatedKes;
  const disbursed = adminApplications.filter((application) => application.status === "DISBURSED").length;

  return { approved, allocatedKes, remainingKes, disbursed };
}
