"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { useAuthStore } from "@/store/auth-store";

const ROLE_LABELS = {
  WARD_ADMIN: "Ward Administrator",
  FINANCE_OFFICER: "Finance Officer",
  COUNTY_ADMIN: "County Administrator",
  PLATFORM_OPERATOR: "Platform Operator",
  STUDENT: "Student",
} as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const inCountySpace = pathname.startsWith("/county") || pathname.startsWith("/settings");
  const userName = user?.full_name?.trim() || (inCountySpace ? "County Officer" : "Ward Officer");
  const roleLabel = user?.role ? ROLE_LABELS[user.role] : inCountySpace ? "Finance Officer" : "Ward Administrator";

  return (
    <CountyBrandingProvider>
      <div className="page-shell county-pattern bg-transparent pb-6">
        <AdminHeader
          portalLabel={inCountySpace ? "County Finance Portal" : "Ward Review Portal"}
          userName={userName}
          roleLabel={roleLabel}
        />

        <div className="w-full px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
            <AdminSidebar variant={inCountySpace ? "county" : "ward"} />
            <main className="min-w-0 space-y-5">{children}</main>
          </div>
        </div>
      </div>
    </CountyBrandingProvider>
  );
}