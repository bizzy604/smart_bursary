import { API_BASE_URL } from "@/lib/constants";

const ACCESS_TOKEN_KEY = "smart-bursary.access-token";

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

function resolveApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
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

function resolveErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const source = payload as Record<string, unknown>;
    if (typeof source.message === "string" && source.message.length > 0) {
      return source.message;
    }
    if (source.error && typeof source.error === "object") {
      const details = source.error as Record<string, unknown>;
      if (typeof details.message === "string" && details.message.length > 0) {
        return details.message;
      }
    }
  }

  return "Request failed. Please try again.";
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
  const token = getAccessToken();
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as unknown;
    throw new Error(resolveErrorMessage(payload));
  }

  return (await response.json()) as T;
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
