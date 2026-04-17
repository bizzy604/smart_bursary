export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "WARD_REVIEW"
  | "COUNTY_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WAITLISTED"
  | "DISBURSED";

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

export const countyBranding: CountyBranding = {
  name: "Turkana County",
  fundName: "Turkana County Education Fund",
  logoText: "TC",
  primaryColor: "#1E3A5F",
  legalReference: "No. 4 of 2023",
};

export const programs: ProgramSummary[] = [
  {
    id: "prog-ward-2024",
    name: "2024 Ward Bursary Programme",
    ward: "Kalokol Ward",
    closesAt: "2026-05-30T23:59:59Z",
    budgetCeilingKes: 5000000,
    allocatedKes: 2150000,
    summary: "Supports secondary, TVET, and university students with demonstrated financial need.",
    eligibilityNotes: [
      "Applicant must be a registered resident of the ward.",
      "Profile must include complete personal and academic details.",
      "One active application per student per program cycle.",
    ],
  },
  {
    id: "prog-girls-stem-2024",
    name: "Girls in STEM Support Grant",
    ward: "County-Wide",
    closesAt: "2026-06-12T23:59:59Z",
    budgetCeilingKes: 1800000,
    allocatedKes: 640000,
    summary: "Additional support for female students in science, technology, engineering, and math tracks.",
    eligibilityNotes: [
      "Open to female students enrolled in accredited institutions.",
      "Applicants must attach an admission or progression letter.",
      "Award amount is determined after county review.",
    ],
  },
];

export const applications: StudentApplicationSummary[] = [
  {
    id: "app-00142",
    reference: "TRK-2026-00142",
    programId: "prog-ward-2024",
    programName: "2024 Ward Bursary Programme",
    status: "WARD_REVIEW",
    requestedKes: 45000,
    submittedAt: "2026-04-10T11:22:00Z",
    updatedAt: "2026-04-12T09:18:00Z",
  },
  {
    id: "app-00158",
    reference: "TRK-2026-00158",
    programId: "prog-girls-stem-2024",
    programName: "Girls in STEM Support Grant",
    status: "DRAFT",
    requestedKes: 30000,
    submittedAt: "2026-04-13T08:12:00Z",
    updatedAt: "2026-04-13T08:32:00Z",
  },
];

export const profileSnapshot: StudentProfileSnapshot = {
  fullName: "Aisha Lokiru",
  email: "aisha.lokiru@example.com",
  phone: "+254712345678",
  county: "Turkana",
  ward: "Kalokol",
  institution: "University of Nairobi",
  course: "Bachelor of Education",
  yearOfStudy: "Year 2",
  familyStatus: "Single Parent",
  siblingsInSchool: 2,
  guardianIncomeKes: 18000,
};

export function getProgramById(programId: string): ProgramSummary | null {
  return programs.find((program) => program.id === programId) ?? null;
}

export function getApplicationById(applicationId: string): StudentApplicationSummary | null {
  return applications.find((application) => application.id === applicationId) ?? null;
}

export function getTimelineForApplication(applicationId: string): TimelineEvent[] {
  const application = getApplicationById(applicationId);
  if (!application) {
    return [];
  }

  if (application.status === "DRAFT") {
    return [
      {
        label: "Application Created",
        status: "complete",
        date: "2026-04-13T08:12:00Z",
        note: "Your draft is saved and ready for completion.",
      },
      {
        label: "Submission",
        status: "current",
        date: "Pending",
        note: "Complete all sections and submit before the program closes.",
      },
      {
        label: "Ward Review",
        status: "upcoming",
        date: "Pending",
        note: "Starts after successful submission.",
      },
    ];
  }

  return [
    {
      label: "Application Created",
      status: "complete",
      date: "2026-04-09T15:01:00Z",
      note: "Application draft was created from your profile.",
    },
    {
      label: "Submitted",
      status: "complete",
      date: "2026-04-10T11:22:00Z",
      note: "Your final form and documents were submitted.",
    },
    {
      label: "AI Scoring Complete",
      status: "complete",
      date: "2026-04-10T11:49:00Z",
      note: "Score card is available to committee reviewers.",
    },
    {
      label: "Ward Review",
      status: "current",
      date: "2026-04-12T09:18:00Z",
      note: "Ward bursary committee is reviewing your request.",
    },
    {
      label: "County Review",
      status: "upcoming",
      date: "Pending",
      note: "Begins after ward recommendation.",
    },
    {
      label: "Final Decision",
      status: "upcoming",
      date: "Pending",
      note: "You will receive SMS and portal updates.",
    },
  ];
}
