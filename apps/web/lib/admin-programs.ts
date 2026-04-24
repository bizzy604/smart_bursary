import { apiRequestJson } from "@/lib/api-client";

export type ProgramStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "SUSPENDED";

type ProgramApiShape = {
  id: string;
  wardId?: string | null;
  name: string;
  description?: string | null;
  budgetCeiling: unknown;
  allocatedTotal: unknown;
  disbursedTotal: unknown;
  opensAt: string;
  closesAt: string;
  academicYear?: string | null;
  status: ProgramStatus;
};

export interface ProgramListItem {
  id: string;
  wardId: string | null;
  name: string;
  description: string | null;
  budgetCeiling: number;
  allocatedTotal: number;
  disbursedTotal: number;
  opensAt: string;
  closesAt: string;
  academicYear: string | null;
  status: ProgramStatus;
}

export interface ProgramDetail extends ProgramListItem {
  eligibilityRules: Array<{
    id: string;
    ruleType: string;
    parameters: unknown;
  }>;
}

export interface ProgramUpsertPayload {
  name: string;
  description?: string;
  wardId?: string;
  budgetCeiling: number;
  opensAt: string;
  closesAt: string;
  academicYear?: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim().length > 0) {
      query.set(key, value);
    }
  }
  const text = query.toString();
  return text.length > 0 ? `?${text}` : "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapProgram(row: ProgramApiShape): ProgramListItem {
  return {
    id: row.id,
    wardId: row.wardId ?? null,
    name: row.name,
    description: row.description ?? null,
    budgetCeiling: toNumber(row.budgetCeiling),
    allocatedTotal: toNumber(row.allocatedTotal),
    disbursedTotal: toNumber(row.disbursedTotal),
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    academicYear: row.academicYear ?? null,
    status: row.status,
  };
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  return apiRequestJson<T>(path, init);
}

export async function fetchAdminPrograms(filters?: {
  status?: ProgramStatus;
  academicYear?: string;
}): Promise<ProgramListItem[]> {
  const payload = await requestJson<{ data: ProgramApiShape[] }>(
    `/programs${buildQuery({ status: filters?.status, academicYear: filters?.academicYear })}`,
    { method: "GET" },
  );

  return payload.data.map(mapProgram);
}

export async function fetchAdminProgramById(programId: string): Promise<ProgramDetail> {
  const payload = await requestJson<{ data: ProgramApiShape & { eligibilityRules?: Array<{ id: string; ruleType: string; parameters: unknown }> } }>(
    `/programs/${programId}`,
    { method: "GET" },
  );

  return {
    ...mapProgram(payload.data),
    eligibilityRules: payload.data.eligibilityRules ?? [],
  };
}

export async function createAdminProgram(input: ProgramUpsertPayload): Promise<ProgramDetail> {
  const payload = await requestJson<{ data: ProgramApiShape & { eligibilityRules?: Array<{ id: string; ruleType: string; parameters: unknown }> } }>(
    "/programs",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return {
    ...mapProgram(payload.data),
    eligibilityRules: payload.data.eligibilityRules ?? [],
  };
}

export async function updateAdminProgram(programId: string, input: ProgramUpsertPayload): Promise<ProgramDetail> {
  const payload = await requestJson<{ data: ProgramApiShape & { eligibilityRules?: Array<{ id: string; ruleType: string; parameters: unknown }> } }>(
    `/programs/${programId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return {
    ...mapProgram(payload.data),
    eligibilityRules: payload.data.eligibilityRules ?? [],
  };
}

export async function publishAdminProgram(programId: string): Promise<{ id: string; status: ProgramStatus }> {
  const payload = await requestJson<{ id: string; status: ProgramStatus }>(`/programs/${programId}/publish`, {
    method: "POST",
  });

  return payload;
}

export async function closeAdminProgram(programId: string): Promise<{ id: string; status: ProgramStatus; closesAt: string }> {
  const payload = await requestJson<{ id: string; status: ProgramStatus; closesAt: string }>(`/programs/${programId}/close`, {
    method: "POST",
  });

  return payload;
}
