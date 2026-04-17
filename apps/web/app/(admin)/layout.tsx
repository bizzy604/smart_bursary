"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { countyFinanceProfile, wardAdminProfile } from "@/lib/admin-data";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inCountySpace = pathname.startsWith("/county") || pathname.startsWith("/settings");

  return (
    <CountyBrandingProvider>
      <div className="page-shell county-pattern bg-transparent pb-6">
        <AdminHeader
          portalLabel={inCountySpace ? "County Finance Portal" : "Ward Review Portal"}
          userName={inCountySpace ? countyFinanceProfile.name : wardAdminProfile.name}
          roleLabel={inCountySpace ? countyFinanceProfile.role : wardAdminProfile.role}
          wardBadge={inCountySpace ? undefined : wardAdminProfile.ward}
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