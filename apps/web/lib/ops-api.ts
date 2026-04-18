import { getAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/constants";

type OpsServiceStatus = "healthy" | "degraded" | "down";

type TenantListApiRow = {
  id: string;
  slug: string;
  name: string;
  planTier: string;
  isActive: boolean;
  wardCount: number;
  userCount: number;
  createdAt: string;
};

type TenantDetailApiRow = {
  id: string;
  slug: string;
  name: string;
  fundName: string | null;
  legalReference: string | null;
  planTier: string;
  primaryColor: string;
  isActive: boolean;
  wardCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

type PlatformHealthApiRow = {
  status: string;
  service: string;
  timestamp: string;
};

type ProvisioningStatusApiRow = {
  ready: boolean;
  message: string;
  defaults?: {
    nationalWardSeedSize?: number;
    defaultPlanTier?: string;
  };
};

export interface OpsTenantSummary {
  id: string;
  slug: string;
  countyName: string;
  planTier: "BASIC" | "STANDARD" | "ENTERPRISE";
  isActive: boolean;
  wardCount: number;
  userCount: number;
  createdAt: string;
}

export interface OpsTenantDetail extends OpsTenantSummary {
  fundName: string;
  legalReference: string;
  primaryColor: string;
  updatedAt: string;
}

export interface OpsServiceHealthItem {
  name: string;
  status: OpsServiceStatus;
  latencyMs: number;
  updatedAt: string;
  note: string;
}

export interface OpsPlatformHealthSnapshot {
  overallStatus: OpsServiceStatus;
  refreshedAt: string;
  totalTenants: number;
  services: OpsServiceHealthItem[];
}

function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function resolveErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const source = payload as Record<string, unknown>;
    if (typeof source.message === "string" && source.message.length > 0) {
      return source.message;
    }

    if (source.error && typeof source.error === "object") {
      const error = source.error as Record<string, unknown>;
      if (typeof error.message === "string" && error.message.length > 0) {
        return error.message;
      }
    }
  }

  return "Request failed. Please try again.";
}

function normalizePlanTier(value: string | undefined): "BASIC" | "STANDARD" | "ENTERPRISE" {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "ENTERPRISE") {
    return "ENTERPRISE";
  }
  if (normalized === "STANDARD") {
    return "STANDARD";
  }
  return "BASIC";
}

function toServiceStatus(value: string | boolean): OpsServiceStatus {
  if (typeof value === "boolean") {
    return value ? "healthy" : "down";
  }

  const normalized = value.toLowerCase();
  if (normalized === "ok" || normalized === "healthy") {
    return "healthy";
  }
  if (normalized === "degraded" || normalized === "warn" || normalized === "warning") {
    return "degraded";
  }

  return "down";
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
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

async function timedRequest<T>(request: () => Promise<T>): Promise<{ data: T; latencyMs: number }> {
  const startedAt = Date.now();
  const data = await request();
  return {
    data,
    latencyMs: Math.max(1, Date.now() - startedAt),
  };
}

function mapTenantSummary(row: TenantListApiRow): OpsTenantSummary {
  return {
    id: row.id,
    slug: row.slug,
    countyName: row.name,
    planTier: normalizePlanTier(row.planTier),
    isActive: Boolean(row.isActive),
    wardCount: Number(row.wardCount ?? 0),
    userCount: Number(row.userCount ?? 0),
    createdAt: row.createdAt,
  };
}

function mapTenantDetail(row: TenantDetailApiRow): OpsTenantDetail {
  return {
    id: row.id,
    slug: row.slug,
    countyName: row.name,
    planTier: normalizePlanTier(row.planTier),
    isActive: Boolean(row.isActive),
    wardCount: Number(row.wardCount ?? 0),
    userCount: Number(row.userCount ?? 0),
    createdAt: row.createdAt,
    fundName: row.fundName?.trim() || `${row.name} Education Fund`,
    legalReference: row.legalReference?.trim() || "Not specified",
    primaryColor: row.primaryColor,
    updatedAt: row.updatedAt,
  };
}

export async function fetchOpsTenants(): Promise<OpsTenantSummary[]> {
  const payload = await requestJson<{ data: TenantListApiRow[] }>("/platform/tenants");
  return (payload.data ?? []).map(mapTenantSummary);
}

export async function fetchOpsTenantById(tenantId: string): Promise<OpsTenantDetail> {
  const payload = await requestJson<{ data: TenantDetailApiRow }>(`/platform/tenants/${tenantId}`);
  return mapTenantDetail(payload.data);
}

export async function fetchOpsTenantBySlug(slug: string): Promise<OpsTenantDetail | null> {
  const list = await fetchOpsTenants();
  const match = list.find((tenant) => tenant.slug === slug);
  if (!match) {
    return null;
  }

  return fetchOpsTenantById(match.id);
}

export async function fetchOpsPlatformHealth(): Promise<OpsPlatformHealthSnapshot> {
  const [healthResult, provisioningResult, registryResult] = await Promise.all([
    timedRequest(() => requestJson<PlatformHealthApiRow>("/health")),
    timedRequest(() => requestJson<ProvisioningStatusApiRow>("/platform/tenants/status")),
    timedRequest(() => requestJson<{ data: TenantListApiRow[] }>("/platform/tenants")),
  ]);

  const healthStatus = toServiceStatus(healthResult.data.status);
  const provisioningStatus = toServiceStatus(provisioningResult.data.ready);
  const registryStatus: OpsServiceStatus = "healthy";

  const services: OpsServiceHealthItem[] = [
    {
      name: "API Gateway",
      status: healthStatus,
      latencyMs: healthResult.latencyMs,
      updatedAt: healthResult.data.timestamp,
      note: `Service: ${healthResult.data.service}`,
    },
    {
      name: "Tenant Provisioning",
      status: provisioningStatus,
      latencyMs: provisioningResult.latencyMs,
      updatedAt: new Date().toISOString(),
      note: provisioningResult.data.message,
    },
    {
      name: "Tenant Registry",
      status: registryStatus,
      latencyMs: registryResult.latencyMs,
      updatedAt: new Date().toISOString(),
      note: `${registryResult.data.data.length} tenant records loaded.`,
    },
  ];

  const hasDown = services.some((service) => service.status === "down");
  const hasDegraded = services.some((service) => service.status === "degraded");

  return {
    overallStatus: hasDown ? "down" : hasDegraded ? "degraded" : "healthy",
    refreshedAt: new Date().toISOString(),
    totalTenants: registryResult.data.data.length,
    services,
  };
}
