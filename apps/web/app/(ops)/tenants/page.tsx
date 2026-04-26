"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card";
import {
  compactChartLabel,
  dashboardChartColor,
  shouldUsePieChart,
} from "@/components/dashboard/chart-utils";
import { DataTable } from "@/components/shared/data-table";
import { DataTableCsvExportButton } from "@/components/shared/data-table-csv-export-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Building2, PauseCircle, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { type SpreadsheetColumn } from "@/lib/csv-export";
import {
  deactivateOpsTenant,
  deleteOpsTenant,
  fetchOpsTenants,
  reactivateOpsTenant,
  type OpsTenantSummary,
} from "@/lib/ops-api";
import { createOpsTenantColumns, type OpsTenantAction } from "./columns";

const OPS_TENANT_CSV_COLUMNS: SpreadsheetColumn<OpsTenantSummary>[] = [
  { header: "County", value: (row) => row.countyName, width: 24 },
  { header: "Slug", value: (row) => row.slug, width: 20 },
  { header: "Plan", value: (row) => row.planTier, width: 14 },
  { header: "Status", value: (row) => (row.isActive ? "Active" : "Inactive"), width: 12 },
  { header: "Users", value: (row) => row.userCount, type: "number", width: 10 },
  { header: "Wards", value: (row) => row.wardCount, type: "number", width: 10 },
  { header: "Provisioned", value: (row) => row.createdAt, type: "date", width: 14 },
  { header: "Tenant ID", value: (row) => row.id, width: 38 },
];

const opsTenantPlanConfig = {
  tenants: {
    label: "Tenants",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const opsTenantUsersConfig = {
  users: {
    label: "Users",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function OpsTenantsPage() {
  const [tenants, setTenants] = useState<OpsTenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTenants = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchOpsTenants();
        if (!mounted) {
          return;
        }

        setTenants(rows);
        setError(null);
      } catch (reason: unknown) {
        if (!mounted) {
          return;
        }

        const message =
          reason instanceof Error
            ? reason.message
            : "Failed to load tenant registry.";
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTenants();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.isActive).length;
    const inactive = tenants.length - active;
    const enterprise = tenants.filter(
      (tenant) => tenant.planTier === "ENTERPRISE",
    ).length;

    return {
      active,
      inactive,
      enterprise,
    };
  }, [tenants]);
  const planDistributionData = useMemo(
    () => [
      {
        tier: "Basic",
        tenants: tenants.filter((tenant) => tenant.planTier === "BASIC").length,
        fill: "var(--chart-5)",
      },
      {
        tier: "Standard",
        tenants: tenants.filter((tenant) => tenant.planTier === "STANDARD")
          .length,
        fill: "var(--chart-2)",
      },
      {
        tier: "Enterprise",
        tenants: tenants.filter((tenant) => tenant.planTier === "ENTERPRISE")
          .length,
        fill: "var(--chart-3)",
      },
    ],
    [tenants],
  );
  const tenantFootprintData = useMemo(
    () =>
      [...tenants]
        .sort((left, right) => right.userCount - left.userCount)
        .slice(0, 5)
        .map((tenant, index) => ({
          countyName: compactChartLabel(tenant.countyName, 18),
          fullName: tenant.countyName,
          users: tenant.userCount,
          wards: tenant.wardCount,
          fill: dashboardChartColor(index),
        })),
    [tenants],
  );
  const topTenant = tenantFootprintData[0] ?? null;
  const showPlanPieChart = shouldUsePieChart(planDistributionData.length);

  const [confirm, setConfirm] = useState<
    | {
        action: OpsTenantAction;
        tenant: OpsTenantSummary;
      }
    | null
  >(null);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);

  const handleAction = useCallback(
    (action: OpsTenantAction, tenant: OpsTenantSummary) => {
      setConfirm({ action, tenant });
    },
    [],
  );

  const columns = useMemo(
    () =>
      createOpsTenantColumns({
        onAction: handleAction,
        pendingTenantId: busyTenantId,
      }),
    [handleAction, busyTenantId],
  );

  const handleConfirm = useCallback(async () => {
    if (!confirm) return;
    const { action, tenant } = confirm;
    setBusyTenantId(tenant.id);
    try {
      if (action === "deactivate") {
        const result = await deactivateOpsTenant(tenant.id);
        setTenants((prev) =>
          prev.map((row) =>
            row.id === tenant.id ? { ...row, isActive: result.isActive } : row,
          ),
        );
        toast.success("Tenant deactivated", {
          description: `${tenant.countyName} is suspended and county admins cannot sign in.`,
        });
      } else if (action === "reactivate") {
        const result = await reactivateOpsTenant(tenant.id);
        setTenants((prev) =>
          prev.map((row) =>
            row.id === tenant.id ? { ...row, isActive: result.isActive } : row,
          ),
        );
        toast.success("Tenant reactivated", {
          description: `${tenant.countyName} can sign in again.`,
        });
      } else {
        await deleteOpsTenant(tenant.id);
        setTenants((prev) => prev.filter((row) => row.id !== tenant.id));
        toast.success("Tenant deleted", {
          description: `${tenant.countyName} has been removed from the registry.`,
        });
      }
      setConfirm(null);
    } catch (reason: unknown) {
      const message =
        reason instanceof Error ? reason.message : "Unable to complete action.";
      toast.error("Action failed", { description: message });
    } finally {
      setBusyTenantId(null);
    }
  }, [confirm]);

  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Tenant Registry"
        description="Monitor county tenants, subscription tiers, and onboarding posture from one operations console."
        icon={Building2}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Active Tenants"
          value={String(stats.active)}
          hint="Counties currently enabled"
          icon={Building2}
          intent="success"
        />
        <StatsCard
          label="Inactive"
          value={String(stats.inactive)}
          hint="Suspended or disabled counties"
          icon={PauseCircle}
          intent="warning"
        />
        <StatsCard
          label="Enterprise"
          value={String(stats.enterprise)}
          hint="Top-tier subscriptions"
          icon={Sparkles}
          intent="brand"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <DashboardChartCard
          eyebrow="Subscription Mix"
          title="Plan tier distribution"
          description="A quick view of how many counties sit in each commercial tier."
          aside={
            <div className="rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-primary">
              {tenants.length} tenants
            </div>
          }
        >
          {tenants.length > 0 ? (
            <>
              <ChartContainer
                config={opsTenantPlanConfig}
                className="min-h-[220px] w-full"
              >
                {showPlanPieChart ? (
                  <PieChart accessibilityLayer margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <ChartTooltip content={<ChartTooltipContent nameKey="tier" />} />
                    <Pie
                      data={planDistributionData}
                      dataKey="tenants"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell key={`${entry.tier}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart
                    accessibilityLayer
                    data={planDistributionData}
                    margin={{ top: 8, right: 8, left: -16 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="tier"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="tenants" radius={10}>
                      {planDistributionData.map((entry) => (
                        <Cell key={entry.tier} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
              <div className="rounded-xl border border-border bg-muted/80 p-3 text-sm text-foreground/90">
                Enterprise counties account for{" "}
                <span className="font-semibold text-primary">
                  {stats.enterprise}
                </span>{" "}
                of the currently provisioned tenants.
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tenant distribution is available yet.
            </p>
          )}
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow="Registry Footprint"
          title="Largest counties by active user base"
          description="Focus operations attention on the counties carrying the heaviest day-to-day usage."
          aside={
            <div className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              Top 5 counties
            </div>
          }
        >
          {tenantFootprintData.length > 0 ? (
            <>
              <ChartContainer
                config={opsTenantUsersConfig}
                className="min-h-[220px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={tenantFootprintData}
                  layout="vertical"
                  margin={{ top: 8, right: 12, left: 24 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="countyName"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tickFormatter={(value) =>
                      compactChartLabel(String(value), 15)
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="users" radius={10}>
                    {tenantFootprintData.map((entry) => (
                      <Cell key={entry.fullName} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              {topTenant ? (
                <div className="rounded-xl border border-accent/20 bg-accent/10 p-3 text-sm text-foreground/90">
                  <span className="font-semibold text-primary">
                    {topTenant.fullName}
                  </span>{" "}
                  currently has the widest operational footprint with{" "}
                  <span className="font-semibold">{topTenant.users}</span> users
                  across{" "}
                  <span className="font-semibold">{topTenant.wards}</span>{" "}
                  wards.
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tenant footprint data will appear here once counties are
              provisioned.
            </p>
          )}
        </DashboardChartCard>
      </section>

      {tenants.length === 0 && !isLoading && !error ? (
        <EmptyState
          title="No tenants available"
          description="No county tenants are currently provisioned in this environment."
        />
      ) : (
        <section className="rounded-2xl border border-border/80 bg-background p-5 shadow-xs">
          <DataTable
            columns={columns}
            data={tenants}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => row.id}
            searchColumnId="countyName"
            searchPlaceholder="Search tenants…"
            initialSorting={[{ id: "countyName", desc: false }]}
            initialPageSize={10}
            emptyState="No tenants match your filters."
            renderSelectedActions={({ selectedRows }) => (
              <DataTableCsvExportButton
                selectedRows={selectedRows}
                columns={OPS_TENANT_CSV_COLUMNS}
                filenamePrefix="ops-tenants"
                itemNoun="tenant"
              />
            )}
          />
        </section>
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && busyTenantId === null) {
            setConfirm(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "delete"
                ? "Delete tenant?"
                : confirm?.action === "deactivate"
                  ? "Deactivate tenant?"
                  : "Reactivate tenant?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete"
                ? `${confirm.tenant.countyName} will be soft-deleted and removed from the registry. This cannot be undone from the UI.`
                : confirm?.action === "deactivate"
                  ? `${confirm?.tenant.countyName} will be suspended and county admins will lose access immediately.`
                  : `${confirm?.tenant.countyName} will regain platform access for its county admins.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyTenantId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant={
                  confirm?.action === "delete" ? "destructive" : "default"
                }
                disabled={busyTenantId !== null}
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirm();
                }}
              >
                {busyTenantId
                  ? "Working…"
                  : confirm?.action === "delete"
                    ? "Delete tenant"
                    : confirm?.action === "deactivate"
                      ? "Deactivate"
                      : "Reactivate"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
