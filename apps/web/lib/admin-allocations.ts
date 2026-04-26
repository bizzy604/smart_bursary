/**
 * Purpose: Frontend client wrappers for the §7 money-integrity allocation endpoints.
 * Why important: Centralises HTTP shape + envelope unwrapping for the AllocationModule
 *                so page components stay declarative and don't bleed transport detail.
 * Used by: County admin programs/[id]/allocations page (Commit 5a) and follow-up
 *          ward + village admin screens (Commits 5b/5c).
 */
import { apiRequestJson } from "@/lib/api-client";

export type DistributionMethod = "PROPORTIONAL" | "MANUAL_OVERRIDE" | "AI_WEIGHTED";

export interface WardAllocationRow {
  id: string;
  wardId: string;
  wardName: string;
  wardCode: string | null;
  allocatedKes: number;
  allocatedTotalKes: number;
  disbursedTotalKes: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WardAllocationListResult {
  programBudgetCeiling: number;
  totalAllocatedToWards: number;
  programRemainingCapacity: number;
  allocations: WardAllocationRow[];
}

export interface CreateWardAllocationResult {
  allocation: WardAllocationRow;
  programBudgetCeiling: number;
  programAllocatedToWards: number;
  programRemainingCapacity: number;
}

export interface VillageProportionalEntry {
  villageUnitId: string;
  villageName: string;
  villageCode: string | null;
  applicantCount: number;
  suggestedAllocatedKes: number;
}

export interface ProportionalSuggestion {
  wardAllocationId: string;
  wardName: string;
  wardPoolKes: number;
  totalApplicants: number;
  distributionMethod: DistributionMethod;
  suggestions: VillageProportionalEntry[];
}

export interface VillageAllocationRow {
  id: string;
  villageUnitId: string;
  villageName: string;
  villageCode: string | null;
  allocatedKes: number;
  allocatedTotalKes: number;
  disbursedTotalKes: number;
  applicantCountAtDistribution: number;
  distributionMethod: DistributionMethod;
  villageAllocationDueAt: string | null;
}

export interface VillageAllocationListResult {
  wardAllocationId: string;
  wardPoolKes: number;
  totalDistributed: number;
  remainingToDistribute: number;
  villages: VillageAllocationRow[];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
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

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

type ApiWardAllocation = {
  id: string;
  wardId: string;
  allocatedKes: unknown;
  allocatedTotalKes: unknown;
  disbursedTotalKes: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  ward?: { name?: string | null; code?: string | null };
};

function mapWardAllocation(row: ApiWardAllocation): WardAllocationRow {
  return {
    id: row.id,
    wardId: row.wardId,
    wardName: row.ward?.name ?? "Unknown ward",
    wardCode: row.ward?.code ?? null,
    allocatedKes: toNumber(row.allocatedKes),
    allocatedTotalKes: toNumber(row.allocatedTotalKes),
    disbursedTotalKes: toNumber(row.disbursedTotalKes),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function fetchWardAllocations(
  programId: string,
): Promise<WardAllocationListResult> {
  const payload = await apiRequestJson<unknown>(
    `/programs/${programId}/ward-allocations`,
    { method: "GET" },
  );
  const result = unwrap<{
    programBudgetCeiling: unknown;
    totalAllocatedToWards: unknown;
    programRemainingCapacity: unknown;
    allocations: ApiWardAllocation[];
  }>(payload);
  return {
    programBudgetCeiling: toNumber(result.programBudgetCeiling),
    totalAllocatedToWards: toNumber(result.totalAllocatedToWards),
    programRemainingCapacity: toNumber(result.programRemainingCapacity),
    allocations: (result.allocations ?? []).map(mapWardAllocation),
  };
}

export async function createWardAllocation(
  programId: string,
  input: { wardId: string; allocatedKes: number; note?: string },
): Promise<CreateWardAllocationResult> {
  const payload = await apiRequestJson<unknown>(
    `/programs/${programId}/ward-allocations`,
    { method: "POST", body: JSON.stringify(input) },
  );
  const result = unwrap<{
    allocation: ApiWardAllocation;
    programBudgetCeiling: unknown;
    programAllocatedToWards: unknown;
    programRemainingCapacity: unknown;
  }>(payload);
  return {
    allocation: mapWardAllocation(result.allocation),
    programBudgetCeiling: toNumber(result.programBudgetCeiling),
    programAllocatedToWards: toNumber(result.programAllocatedToWards),
    programRemainingCapacity: toNumber(result.programRemainingCapacity),
  };
}

export async function fetchProportionalSuggestion(
  wardAllocationId: string,
): Promise<ProportionalSuggestion> {
  const payload = await apiRequestJson<unknown>(
    `/ward-allocations/${wardAllocationId}/proportional-suggestion`,
    { method: "GET" },
  );
  const result = unwrap<{
    wardAllocationId: string;
    wardName: string;
    wardPoolKes: unknown;
    totalApplicants: number;
    distributionMethod: DistributionMethod;
    suggestions: Array<{
      villageUnitId: string;
      villageName: string;
      villageCode: string | null;
      applicantCount: number;
      suggestedAllocatedKes: unknown;
    }>;
  }>(payload);
  return {
    wardAllocationId: result.wardAllocationId,
    wardName: result.wardName,
    wardPoolKes: toNumber(result.wardPoolKes),
    totalApplicants: result.totalApplicants,
    distributionMethod: result.distributionMethod,
    suggestions: (result.suggestions ?? []).map((row) => ({
      villageUnitId: row.villageUnitId,
      villageName: row.villageName,
      villageCode: row.villageCode,
      applicantCount: row.applicantCount,
      suggestedAllocatedKes: toNumber(row.suggestedAllocatedKes),
    })),
  };
}

export async function distributeWardToVillages(
  wardAllocationId: string,
  input: {
    villageAllocations: Array<{
      villageUnitId: string;
      allocatedKes: number;
      applicantCountAtDistribution?: number;
    }>;
    distributionMethod: DistributionMethod;
    villageAllocationDueAt?: string;
    note?: string;
  },
): Promise<VillageAllocationListResult & { applicationsTransitioned: number }> {
  const payload = await apiRequestJson<unknown>(
    `/ward-allocations/${wardAllocationId}/distribute`,
    { method: "POST", body: JSON.stringify(input) },
  );
  const result = unwrap<{
    wardAllocationId: string;
    wardPoolKes: unknown;
    totalDistributed: unknown;
    villageAllocations: VillageAllocationRow[];
    applicationsTransitioned: number;
  }>(payload);
  return {
    wardAllocationId: result.wardAllocationId,
    wardPoolKes: toNumber(result.wardPoolKes),
    totalDistributed: toNumber(result.totalDistributed),
    remainingToDistribute:
      toNumber(result.wardPoolKes) - toNumber(result.totalDistributed),
    villages: result.villageAllocations ?? [],
    applicationsTransitioned: result.applicationsTransitioned ?? 0,
  };
}

export async function fetchVillageAllocations(
  wardAllocationId: string,
): Promise<VillageAllocationListResult> {
  const payload = await apiRequestJson<unknown>(
    `/ward-allocations/${wardAllocationId}/villages`,
    { method: "GET" },
  );
  const result = unwrap<{
    wardAllocationId: string;
    wardPoolKes: unknown;
    totalDistributed: unknown;
    remainingToDistribute: unknown;
    villages: Array<{
      id: string;
      villageUnitId: string;
      allocatedKes: unknown;
      allocatedTotalKes: unknown;
      disbursedTotalKes: unknown;
      applicantCountAtDistribution: number;
      distributionMethod: DistributionMethod;
      villageAllocationDueAt: string | null;
      villageUnit?: { name?: string; code?: string | null };
    }>;
  }>(payload);
  return {
    wardAllocationId: result.wardAllocationId,
    wardPoolKes: toNumber(result.wardPoolKes),
    totalDistributed: toNumber(result.totalDistributed),
    remainingToDistribute: toNumber(result.remainingToDistribute),
    villages: (result.villages ?? []).map((row) => ({
      id: row.id,
      villageUnitId: row.villageUnitId,
      villageName: row.villageUnit?.name ?? "Unknown village",
      villageCode: row.villageUnit?.code ?? null,
      allocatedKes: toNumber(row.allocatedKes),
      allocatedTotalKes: toNumber(row.allocatedTotalKes),
      disbursedTotalKes: toNumber(row.disbursedTotalKes),
      applicantCountAtDistribution: row.applicantCountAtDistribution,
      distributionMethod: row.distributionMethod,
      villageAllocationDueAt: row.villageAllocationDueAt,
    })),
  };
}
