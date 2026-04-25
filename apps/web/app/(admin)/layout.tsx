"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { canAccessPathForRole, resolvePostLoginRoute } from "@/lib/role-routing";
import { useAuthStore } from "@/store/auth-store";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const ROLE_LABELS = {
  WARD_ADMIN: "Ward Administrator",
  FINANCE_OFFICER: "Finance Officer",
  COUNTY_ADMIN: "County Administrator",
  PLATFORM_OPERATOR: "Platform Operator",
  STUDENT: "Student",
} as const;

type AdminRole = "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN";

function isAdminRole(role: string): role is AdminRole {
  return role === "WARD_ADMIN" || role === "FINANCE_OFFICER" || role === "COUNTY_ADMIN";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const isAuthorizedRole = userRole ? isAdminRole(userRole) : false;
  const hasRouteAccess = userRole ? canAccessPathForRole(userRole, pathname) : false;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdminRole(user.role)) {
      router.replace(resolvePostLoginRoute(user.role));
      return;
    }

    if (!canAccessPathForRole(user.role, pathname)) {
      router.replace(resolvePostLoginRoute(user.role));
    }
  }, [pathname, router, user]);

  if (!user || !isAuthorizedRole || !hasRouteAccess) {
    return null;
  }

  const adminRole = user.role as AdminRole;
  const inCountySpace = adminRole !== "WARD_ADMIN";
  const userName = user.full_name?.trim() || (inCountySpace ? "County Officer" : "Ward Officer");
  const roleLabel = ROLE_LABELS[adminRole];
  const portalLabel = adminRole === "WARD_ADMIN"
    ? "Ward Review Portal"
    : adminRole === "COUNTY_ADMIN"
      ? "County Administration Portal"
      : "County Finance Portal";

  return (
    <CountyBrandingProvider>
      <SidebarProvider defaultOpen>
        <AdminSidebar role={adminRole} />
        <SidebarInset>
          <div className="page-shell county-pattern bg-transparent pb-6">
            <AdminHeader
              homeHref={resolvePostLoginRoute(adminRole)}
              portalLabel={portalLabel}
              userName={userName}
              roleLabel={roleLabel}
            />

            <div className="w-full px-4 pb-6 pt-4 sm:px-6 lg:px-8">
              <main className="min-w-0 space-y-5">{children}</main>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </CountyBrandingProvider>
  );
}