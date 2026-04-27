import { apiRequestJson } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import type {
  ApplicationStatus,
  SectionKey,
  StudentApplicationDetail,
  StudentApplicationSummary,
  StudentProfileSnapshot,
  StudentProgramSummary,
  TimelineEvent,
} from "@/lib/student-types";

type ProgramRule = {
  ruleType?: string;
  parameters?: unknown;
};

type ProgramApiRow = {
  id: string;
  wardId?: string | null;
  name: string;
  description?: string | null;
  budgetCeiling?: unknown;
  allocatedTotal?: unknown;
  closesAt?: string;
  opensAt?: string;
  status?: string;
  eligible?: boolean;
  ineligibilityReason?: string | null;
  ineligibility_reason?: string | null;
  eligibilityRules?: ProgramRule[];
};

type ListApplicationApiRow = {
  id: string;
  status: string;
  programId: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  program: {
    id: string;
    name: string;
  };
};

type ApplicationDetailApiRow = {
  id: string;
  status: string;
  programId: string;
  totalFeeKes?: unknown;
  outstandingBalance?: unknown;
  amountRequested?: unknown;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  sections?: Array<{
    sectionKey: string;
    data: unknown;
    isComplete: boolean;
    savedAt: string;
  }>;
  program: {
    id: string;
    name: string;
  };
};

type TimelineApiEnvelope = {
  data: Array<{
    eventType: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    metadata?: unknown;
    occurredAt: string;
  }>;
};

type ProfileApiRow = {
  personal?: {
    fullName?: string | null;
    nationalId?: string | null;
    homeWard?: string | null;
    phone?: string | null;
  };
  academic?: {
    institutionName?: string | null;
    admissionNumber?: string | null;
    courseName?: string | null;
    yearFormClass?: string | null;
  };
  family?: {
    familyStatus?: string | null;
    numSiblingsInSchool?: number | null;
    guardianIncomeKes?: number | null;
    fatherIncomeKes?: number | null;
    motherIncomeKes?: number | null;
  } | null;
};

type AuthMeRow = {
  email?: string;
  countyId?: string;
};

type DraftResponse = {
  id: string;
};

type SubmitResponse = {
  id: string;
  status: string;
  submittedAt: string;
};

const SECTION_KEYS: SectionKey[] = [
  "section-a",
  "section-b",
  "section-c",
  "section-d",
  "section-e",
  "section-f",
];

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  return apiRequestJson<T>(path, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function asApplicationStatus(value: string | undefined): ApplicationStatus {
  const normalized = (value ?? "DRAFT").toUpperCase();
  const allowed: ApplicationStatus[] = [
    "DRAFT",
    "SUBMITTED",
    "WARD_REVIEW",
    "WARD_DISTRIBUTION_PENDING",
    "VILLAGE_ALLOCATION_PENDING",
    "ALLOCATED",
    "COUNTY_REVIEW",
    "APPROVED",
    "REJECTED",
    "WAITLISTED",
    "DISBURSED",
    "WITHDRAWN",
  ];

  return allowed.includes(normalized as ApplicationStatus)
    ? (normalized as ApplicationStatus)
    : "DRAFT";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
  const text = toText(value);
  return text.length > 0 ? text : undefined;
}

function buildProgramEligibilityNotes(program: ProgramApiRow): string[] {
  const notes: string[] = [];
  for (const rule of program.eligibilityRules ?? []) {
    const ruleType = (rule.ruleType ?? "").toUpperCase();
    if (ruleType === "EDUCATION_LEVEL") {
      const parameters = (rule.parameters ?? {}) as Record<string, unknown>;
      const allowed = Array.isArray(parameters.allowed)
        ? parameters.allowed.filter((item): item is string => typeof item === "string")
        : [];
      if (allowed.length > 0) {
        notes.push(`Eligible education levels: ${allowed.join(", ")}.`);
      }
      continue;
    }

    if (ruleType === "INCOME_BRACKET") {
      const parameters = (rule.parameters ?? {}) as Record<string, unknown>;
      const max = toOptionalNumber(parameters.max_annual_income_kes);
      if (max !== undefined) {
        notes.push(`Household annual income should be up to KES ${max.toLocaleString()}.`);
      }
    }
  }

  if (notes.length === 0 && (program.ineligibilityReason || program.ineligibility_reason)) {
    notes.push(program.ineligibilityReason ?? program.ineligibility_reason ?? "");
  }

  if (notes.length === 0) {
    notes.push("Eligibility is determined from your submitted profile and supporting details.");
  }

  return notes;
}

function mapProgram(program: ProgramApiRow): StudentProgramSummary {
  return {
    id: program.id,
    name: program.name,
    ward: program.wardId ? "Ward-specific" : "County-wide",
    closesAt: program.closesAt ?? new Date().toISOString(),
    budgetCeilingKes: toNumber(program.budgetCeiling),
    allocatedKes: toNumber(program.allocatedTotal),
    summary: toOptionalText(program.description) ?? "County bursary support program.",
    eligibilityNotes: buildProgramEligibilityNotes(program),
  };
}

function buildReference(applicationId: string, status: ApplicationStatus): string {
  const prefix = status === "DRAFT" ? "DRAFT" : "APP";
  return `${prefix}-${applicationId.slice(0, 8).toUpperCase()}`;
}

function mapApplicationSummary(
  row: ListApplicationApiRow,
  requestedKes: number,
): StudentApplicationSummary {
  const status = asApplicationStatus(row.status);
  const submittedAt = row.submittedAt ?? row.createdAt;
  return {
    id: row.id,
    reference: buildReference(row.id, status),
    programId: row.programId,
    programName: row.program.name,
    status,
    requestedKes,
    submittedAt,
    updatedAt: row.updatedAt,
  };
}

function mapApplicationDetail(row: ApplicationDetailApiRow): StudentApplicationDetail {
  const status = asApplicationStatus(row.status);
  const submittedAt = row.submittedAt ?? row.createdAt;

  const sections = (row.sections ?? [])
    .map((section) => {
      if (!SECTION_KEYS.includes(section.sectionKey as SectionKey)) {
        return null;
      }
      const payload = section.data;
      const data = payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};

      return {
        sectionKey: section.sectionKey as SectionKey,
        data,
        isComplete: Boolean(section.isComplete),
        savedAt: section.savedAt,
      };
    })
    .filter((section): section is StudentApplicationDetail["sections"][number] => section !== null);

  return {
    id: row.id,
    reference: buildReference(row.id, status),
    programId: row.programId,
    programName: row.program.name,
    status,
    requestedKes: toNumber(row.amountRequested),
    submittedAt,
    updatedAt: row.updatedAt,
    totalFeeKes: toNumber(row.totalFeeKes),
    outstandingKes: toNumber(row.outstandingBalance),
    reasonForSupport: toOptionalText(row.reason) ?? "",
    sections,
  };
}

function humanizeEventType(eventType: string): string {
  return eventType
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildTimelineNote(row: TimelineApiEnvelope["data"][number]): string {
  if (row.metadata && typeof row.metadata === "object") {
    const metadata = row.metadata as Record<string, unknown>;
    if (typeof metadata.note === "string" && metadata.note.length > 0) {
      return metadata.note;
    }
    if (typeof metadata.message === "string" && metadata.message.length > 0) {
      return metadata.message;
    }
  }

  const from = toOptionalText(row.fromStatus) ?? "unknown";
  const to = toOptionalText(row.toStatus) ?? "unknown";
  return `Status changed from ${from} to ${to}.`;
}

export async function fetchStudentPrograms(): Promise<StudentProgramSummary[]> {
  const rows = await requestJson<ProgramApiRow[]>("/programs");
  return rows
    .filter((program) => program.eligible !== false)
    .map(mapProgram)
    .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
}

export async function fetchStudentProgramById(programId: string): Promise<StudentProgramSummary> {
  const row = await requestJson<ProgramApiRow>(`/programs/${programId}`);
  return mapProgram(row);
}

export async function fetchStudentProfile(): Promise<StudentProfileSnapshot> {
  const [profile, me] = await Promise.all([
    requestJson<ProfileApiRow>("/profile"),
    requestJson<AuthMeRow>("/auth/me").catch(() => ({} as AuthMeRow)),
  ]);

  const family = profile.family ?? null;
  const guardianIncome = toNumber(family?.guardianIncomeKes);
  const fatherIncome = toNumber(family?.fatherIncomeKes);
  const motherIncome = toNumber(family?.motherIncomeKes);

  return {
    fullName: toOptionalText(profile.personal?.fullName) ?? "Not provided",
    nationalId: toOptionalText(profile.personal?.nationalId) ?? "Not provided",
    admissionNumber: toOptionalText(profile.academic?.admissionNumber) ?? "Not provided",
    email: toOptionalText(me.email) ?? "Not provided",
    phone: toOptionalText(profile.personal?.phone) ?? "Not provided",
    county: toOptionalText(me.countyId) ?? "Current county",
    ward: toOptionalText(profile.personal?.homeWard) ?? "Not provided",
    institution: toOptionalText(profile.academic?.institutionName) ?? "Not provided",
    course: toOptionalText(profile.academic?.courseName) ?? "Not provided",
    yearOfStudy: toOptionalText(profile.academic?.yearFormClass) ?? "Not provided",
    familyStatus: toOptionalText(family?.familyStatus) ?? "Not provided",
    siblingsInSchool: toNumber(family?.numSiblingsInSchool),
    guardianIncomeKes: guardianIncome || fatherIncome || motherIncome,
  };
}

export async function fetchStudentApplicationDetail(
  applicationId: string,
): Promise<StudentApplicationDetail> {
  const row = await requestJson<ApplicationDetailApiRow>(`/applications/${applicationId}`);
  return mapApplicationDetail(row);
}

export async function fetchStudentApplications(): Promise<StudentApplicationSummary[]> {
  const rows = await requestJson<ListApplicationApiRow[]>("/applications/my-applications");
  const detailsById = new Map<string, StudentApplicationDetail>();

  const detailResults = await Promise.allSettled(
    rows.map(async (row) => ({
      id: row.id,
      detail: await fetchStudentApplicationDetail(row.id),
    })),
  );

  for (const result of detailResults) {
    if (result.status === "fulfilled") {
      detailsById.set(result.value.id, result.value.detail);
    }
  }

  return rows
    .map((row) => mapApplicationSummary(row, detailsById.get(row.id)?.requestedKes ?? 0))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function fetchStudentApplicationTimeline(
  applicationId: string,
): Promise<TimelineEvent[]> {
  const payload = await requestJson<TimelineApiEnvelope>(`/applications/${applicationId}/timeline`);
  const rows = payload.data ?? [];

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row, index) => ({
    label: humanizeEventType(row.eventType),
    status: index === rows.length - 1 ? "current" : "complete",
    date: row.occurredAt,
    note: buildTimelineNote(row),
  }));
}

export async function createApplicationDraft(programId: string): Promise<DraftResponse> {
  return requestJson<DraftResponse>("/applications/draft", {
    method: "POST",
    body: JSON.stringify({ programId }),
  });
}

export async function saveApplicationSection(
  applicationId: string,
  sectionKey: SectionKey,
  data: Record<string, unknown>,
): Promise<void> {
  await requestJson<unknown>(`/applications/${applicationId}/section`, {
    method: "PUT",
    body: JSON.stringify({
      sectionKey,
      data: JSON.stringify(data),
    }),
  });
}

export async function submitStudentApplication(applicationId: string): Promise<SubmitResponse> {
  return requestJson<SubmitResponse>("/applications/submit", {
    method: "POST",
    body: JSON.stringify({ applicationId }),
  });
}

export async function withdrawStudentApplication(
  applicationId: string,
): Promise<{ id: string; status: string }> {
  return requestJson<{ id: string; status: string }>(`/applications/${applicationId}/withdraw`, {
    method: "POST",
  });
}

export async function deleteStudentDraftApplication(
  applicationId: string,
): Promise<{ id: string; deleted: boolean }> {
  return requestJson<{ id: string; deleted: boolean }>(`/applications/${applicationId}/draft`, {
    method: "DELETE",
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeSectionA(data: Record<string, unknown>): Record<string, unknown> {
  return {
    fullName: toText(data.fullName),
    nationalIdOrBirthCert: toText(data.nationalIdOrBirthCert),
    phone: toText(data.phone),
    email: toText(data.email),
    institution: toText(data.institution),
    admissionNumber: toText(data.admissionNumber),
    course: toText(data.course),
    yearOfStudy: toText(data.yearOfStudy),
    subCountyId: toText(data.subCountyId),
    wardId: toText(data.wardId),
    villageUnitId: toText(data.villageUnitId),
  };
}

function normalizeSectionB(data: Record<string, unknown>): Record<string, unknown> {
  const helbApplied = Boolean(data.helbApplied);
  const priorBursaryReceived = Boolean(data.priorBursaryReceived);

  return {
    requestedKes: toNumber(data.requestedKes),
    feeBalanceKes: toNumber(data.feeBalanceKes),
    totalFeeKes: toNumber(data.totalFeeKes),
    sponsorSupportKes: toOptionalNumber(data.sponsorSupportKes),
    helbApplied,
    helbAmountKes: helbApplied ? toNumber(data.helbAmountKes) : undefined,
    priorBursaryReceived,
    priorBursarySource: priorBursaryReceived ? toText(data.priorBursarySource) : undefined,
    priorBursaryAmountKes: priorBursaryReceived ? toNumber(data.priorBursaryAmountKes) : undefined,
    reasonForSupport: toText(data.reasonForSupport),
  };
}

function normalizeSectionC(data: Record<string, unknown>): Record<string, unknown> {
  const siblings = Array.isArray(data.siblings)
    ? data.siblings
      .map((item) => {
        const sibling = asRecord(item);
        return {
          name: toText(sibling.name),
          institution: toText(sibling.institution),
          level: toText(sibling.level),
          annualFeeKes: toOptionalNumber(sibling.annualFeeKes),
          feePaidKes: toOptionalNumber(sibling.feePaidKes),
        };
      })
      .filter((item) => item.name.length > 0 && item.institution.length > 0 && item.level.length > 0)
    : [];

  return {
    familyStatus: toText(data.familyStatus),
    guardianName: toText(data.guardianName),
    guardianRelationship: toText(data.guardianRelationship),
    guardianPhone: toText(data.guardianPhone),
    guardianOccupation: toOptionalText(data.guardianOccupation),
    householdSize: toNumber(data.householdSize),
    dependantsInSchool: toOptionalNumber(data.dependantsInSchool),
    siblings,
  };
}

function normalizeSectionD(data: Record<string, unknown>): Record<string, unknown> {
  const income = asRecord(data.income);
  return {
    income: {
      fatherOccupation: toOptionalText(income.fatherOccupation),
      fatherMonthlyIncomeKes: toOptionalNumber(income.fatherMonthlyIncomeKes),
      motherOccupation: toOptionalText(income.motherOccupation),
      motherMonthlyIncomeKes: toOptionalNumber(income.motherMonthlyIncomeKes),
      guardianOccupation: toOptionalText(income.guardianOccupation),
      guardianMonthlyIncomeKes: toOptionalNumber(income.guardianMonthlyIncomeKes),
      additionalIncomeSource: toOptionalText(income.additionalIncomeSource),
      additionalIncomeKes: toOptionalNumber(income.additionalIncomeKes),
    },
    rentOrBoardingKes: toOptionalNumber(data.rentOrBoardingKes),
    medicalSupportKes: toOptionalNumber(data.medicalSupportKes),
    supportFromWellWishersKes: toOptionalNumber(data.supportFromWellWishersKes),
    hardshipNarrative: toText(data.hardshipNarrative),
  };
}

function normalizeSectionE(data: Record<string, unknown>): Record<string, unknown> {
  const hasOtherBursary = Boolean(data.hasOtherBursary);
  const hasDisabilityNeeds = Boolean(data.hasDisabilityNeeds);
  return {
    hasOtherBursary,
    otherBursaryDetails: hasOtherBursary ? toText(data.otherBursaryDetails) : undefined,
    hasDisabilityNeeds,
    disabilityDetails: hasDisabilityNeeds ? toText(data.disabilityDetails) : undefined,
    declarationName: toText(data.declarationName),
    confirmTruth: Boolean(data.confirmTruth),
    authorizeVerification: Boolean(data.authorizeVerification),
    acceptPrivacyPolicy: Boolean(data.acceptPrivacyPolicy),
  };
}

function normalizeSectionF(data: Record<string, unknown>): Record<string, unknown> {
  const documents = Array.isArray(data.documents)
    ? data.documents
      .map((item) => {
        const document = asRecord(item);
        return {
          type: toText(document.type),
          label: toText(document.label),
          fileName: toText(document.fileName),
        };
      })
      .filter((item) => item.type.length > 0 && item.label.length > 0 && item.fileName.length > 0)
    : [];

  return {
    documents,
    additionalNotes: toOptionalText(data.additionalNotes),
  };
}

export async function uploadDocument(applicationId: string, docType: string, file: File): Promise<{ id: string; downloadUrl: string }> {
  const formData = new FormData();
  formData.append('applicationId', applicationId);
  formData.append('docType', docType);
  formData.append('file', file);

  const token = getAccessToken();
  const response = await fetch('/api/v1/documents/upload', {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload document');
  }

  return response.json();
}

export function buildApplicationSectionPayloads(
  sectionData: Record<string, unknown>,
): Array<{ sectionKey: SectionKey; data: Record<string, unknown> }> {
  const sectionA = normalizeSectionA(asRecord(sectionData["section-a"]));
  const sectionB = normalizeSectionB(asRecord(sectionData["section-b"]));
  const sectionC = normalizeSectionC(asRecord(sectionData["section-c"]));
  const sectionD = normalizeSectionD(asRecord(sectionData["section-d"]));
  const sectionE = normalizeSectionE(asRecord(sectionData["section-e"]));
  const sectionF = normalizeSectionF(asRecord(sectionData["section-f"]));

  return [
    { sectionKey: "section-a", data: sectionA },
    { sectionKey: "section-b", data: sectionB },
    { sectionKey: "section-c", data: sectionC },
    { sectionKey: "section-d", data: sectionD },
    { sectionKey: "section-e", data: sectionE },
    { sectionKey: "section-f", data: sectionF },
  ];
}
