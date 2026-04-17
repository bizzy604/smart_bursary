export interface TenantHealthSnapshot {
  api: "healthy" | "degraded" | "down";
  web: "healthy" | "degraded" | "down";
  aiScoring: "healthy" | "degraded" | "down";
  queue: "healthy" | "degraded" | "down";
}

export interface TenantSummary {
  slug: string;
  countyName: string;
  fundName: string;
  plan: "Basic" | "Standard" | "Enterprise";
  status: "active" | "trial" | "suspended";
  onboardedAt: string;
  activeUsers: number;
  applicationsThisCycle: number;
  health: TenantHealthSnapshot;
}

export interface ServiceHealthItem {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  updatedAt: string;
}

export const tenants: TenantSummary[] = [
  {
    slug: "turkana",
    countyName: "Turkana County",
    fundName: "Turkana County Education Fund",
    plan: "Enterprise",
    status: "active",
    onboardedAt: "2026-01-15T10:00:00Z",
    activeUsers: 4231,
    applicationsThisCycle: 498,
    health: {
      api: "healthy",
      web: "healthy",
      aiScoring: "degraded",
      queue: "healthy",
    },
  },
  {
    slug: "nairobi",
    countyName: "Nairobi County",
    fundName: "Nairobi Student Support Fund",
    plan: "Enterprise",
    status: "active",
    onboardedAt: "2026-02-01T08:20:00Z",
    activeUsers: 5810,
    applicationsThisCycle: 911,
    health: {
      api: "healthy",
      web: "healthy",
      aiScoring: "healthy",
      queue: "healthy",
    },
  },
  {
    slug: "kisumu",
    countyName: "Kisumu County",
    fundName: "Kisumu County Bursary Programme",
    plan: "Standard",
    status: "trial",
    onboardedAt: "2026-03-28T11:40:00Z",
    activeUsers: 917,
    applicationsThisCycle: 203,
    health: {
      api: "healthy",
      web: "degraded",
      aiScoring: "healthy",
      queue: "healthy",
    },
  },
];

export const platformServices: ServiceHealthItem[] = [
  { name: "Web Frontend", status: "healthy", latencyMs: 142, updatedAt: "2026-04-17T10:12:00Z" },
  { name: "API Gateway", status: "healthy", latencyMs: 181, updatedAt: "2026-04-17T10:12:00Z" },
  { name: "AI Scoring Worker", status: "degraded", latencyMs: 940, updatedAt: "2026-04-17T10:11:00Z" },
  { name: "Queue Processor", status: "healthy", latencyMs: 129, updatedAt: "2026-04-17T10:12:00Z" },
  { name: "Notification Service", status: "healthy", latencyMs: 210, updatedAt: "2026-04-17T10:12:00Z" },
];

export function getTenantBySlug(slug: string): TenantSummary | null {
  return tenants.find((tenant) => tenant.slug === slug) ?? null;
}

export function countServiceStatus(status: ServiceHealthItem["status"]): number {
  return platformServices.filter((service) => service.status === status).length;
}
