/**
 * Purpose: Shared student-domain type definitions and a neutral branding default.
 * Why important: All mock arrays (programs / applications / profileSnapshot) and helper
 *                functions have been removed — runtime data now comes from the backend
 *                via `lib/student-api.ts`, `lib/admin-allocations.ts`, and similar clients.
 *                The only runtime export here is `countyBranding`, used by `store/county-store.ts`
 *                as the initial fallback before `CountyBrandingProvider` populates real
 *                tenant settings via `fetchCountyBranding()` on mount.
 * Used by: `store/county-store.ts` and any UI/API client modules that need the
 *          shared `ApplicationStatus`, `CountyBranding`, etc. types.
 */

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "WARD_REVIEW"
  | "WARD_DISTRIBUTION_PENDING"
  | "VILLAGE_ALLOCATION_PENDING"
  | "ALLOCATED"
  | "COUNTY_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WAITLISTED"
  | "DISBURSED"
  | "WITHDRAWN";

export interface ProgramSummary {
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

export interface TimelineEvent {
  label: string;
  status: "complete" | "current" | "upcoming";
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

export interface CountyBranding {
  name: string;
  fundName: string;
  logoText: string;
  primaryColor: string;
  legalReference?: string;
}

/**
 * Neutral branding default used as the zustand store's initial state. It is
 * deliberately tenant-agnostic — `CountyBrandingProvider` overrides it on mount
 * by calling `fetchCountyBranding()` against `/admin/settings/branding`. If
 * the call fails (e.g., student role not authorised, network error) the user
 * sees this neutral default rather than a misleading hardcoded county name.
 */
export const countyBranding: CountyBranding = {
  name: "County Bursary Fund",
  fundName: "County Bursary Fund",
  logoText: "CB",
  primaryColor: "#1E3A5F",
  legalReference: "",
};
