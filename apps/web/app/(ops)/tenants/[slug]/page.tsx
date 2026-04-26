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
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "degraded") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-red-100 bg-red-50 text-red-700";
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
      <section className="rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground shadow-xs">
        Loading tenant detail...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
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
      <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
        <h1 className="font-serif text-2xl font-semibold text-primary">{tenant.countyName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tenant.fundName}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-medium text-foreground">{tenant.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium text-foreground">{tenant.planTier}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Provisioned</dt>
            <dd className="font-medium text-foreground">{formatShortDate(tenant.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Users</dt>
            <dd className="font-medium text-foreground">{tenant.userCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Wards</dt>
            <dd className="font-medium text-foreground">{tenant.wardCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last Updated</dt>
            <dd className="font-medium text-foreground">{formatShortDate(tenant.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-background p-5 shadow-xs">
        <h2 className="font-serif text-lg font-semibold text-primary">Tenant Configuration</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Fund Name</dt>
            <dd className="font-medium text-foreground">{tenant.fundName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Primary Color</dt>
            <dd className="font-medium text-foreground">{tenant.primaryColor}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Legal Reference</dt>
            <dd className="font-medium text-foreground">{tenant.legalReference}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-background p-5 shadow-xs">
        <h2 className="font-serif text-lg font-semibold text-primary">Operational Signals</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared platform health indicators available to operators while handling this tenant.
        </p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {(health?.services ?? []).map((service) => (
            <div key={service.name} className="rounded-xl border border-border bg-muted p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{service.name}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold uppercase ${chipClasses(service.status)}`}>
                {service.status}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">{service.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-5 shadow-xs">
        <h2 className="font-serif text-lg font-semibold text-primary">Operations Controls</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
