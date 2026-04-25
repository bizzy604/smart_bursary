"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import {
  fetchOpsPlatformHealth,
  fetchOpsTenantBySlug,
  type OpsPlatformHealthSnapshot,
  type OpsTenantDetail,
} from "@/lib/ops-api";

function chipClasses(status: "healthy" | "degraded" | "down"): string {
  if (status === "healthy") {
    return "border-success-100 bg-success-50 text-success-700";
  }

  if (status === "degraded") {
    return "border-warning-100 bg-warning-50 text-warning-700";
  }

  return "border-danger-100 bg-danger-50 text-danger-700";
}

export default function TenantDetailPage() {
  const params = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<OpsTenantDetail | null>(null);
  const [health, setHealth] = useState<OpsPlatformHealthSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tenantDetail, healthSnapshot] = await Promise.all([
        fetchOpsTenantBySlug(params.slug),
        fetchOpsPlatformHealth(),
      ]);

      setTenant(tenantDetail);
      setHealth(healthSnapshot);
      setError(null);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Failed to load tenant detail.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-xs">
        Loading tenant detail...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700">
        {error}
      </section>
    );
  }

  if (!tenant) {
    return (
      <EmptyState
        title="Tenant not found"
        description="The selected tenant is unavailable or does not exist in this environment."
        action={
          <Link href="/tenants">
            <Button>Back to Tenants</Button>
          </Link>
        }
      />
    );
  }

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-brand-900">{tenant.countyName}</h1>
        <p className="mt-1 text-sm text-gray-600">{tenant.fundName}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Slug</dt>
            <dd className="font-medium text-gray-900">{tenant.slug}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Plan</dt>
            <dd className="font-medium text-gray-900">{tenant.planTier}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Provisioned</dt>
            <dd className="font-medium text-gray-900">{formatShortDate(tenant.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Users</dt>
            <dd className="font-medium text-gray-900">{tenant.userCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Wards</dt>
            <dd className="font-medium text-gray-900">{tenant.wardCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Last Updated</dt>
            <dd className="font-medium text-gray-900">{formatShortDate(tenant.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Tenant Configuration</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Fund Name</dt>
            <dd className="font-medium text-gray-900">{tenant.fundName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Primary Color</dt>
            <dd className="font-medium text-gray-900">{tenant.primaryColor}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Legal Reference</dt>
            <dd className="font-medium text-gray-900">{tenant.legalReference}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Operational Signals</h2>
        <p className="mt-1 text-sm text-gray-600">
          Shared platform health indicators available to operators while handling this tenant.
        </p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {(health?.services ?? []).map((service) => (
            <div key={service.name} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">{service.name}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${chipClasses(service.status)}`}>
                {service.status}
              </span>
              <p className="mt-2 text-xs text-gray-600">{service.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="font-display text-lg font-semibold text-brand-900">Operations Controls</h2>
        <p className="mt-1 text-sm text-gray-600">
          Actions remain operator-controlled while provisioning and subscription flows are managed through platform APIs.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled>Recompute Tenant Metrics</Button>
          <Button variant="outline" size="sm" disabled>View Audit Log</Button>
          <Button variant="destructive" size="sm" disabled>Suspend Tenant</Button>
          <Link href="/tenants">
            <Button variant="ghost" size="sm">Back to Tenants</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
