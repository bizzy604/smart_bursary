"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { StudentBottomNav } from "@/components/layout/student-bottom-nav";
import { StudentHeader } from "@/components/layout/student-header";
import { StudentSidebar } from "@/components/layout/student-sidebar";
import { canAccessPathForRole, resolvePostLoginRoute } from "@/lib/role-routing";
import { useAuthStore } from "@/store/auth-store";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const hasRouteAccess = user ? canAccessPathForRole(user.role, pathname) : false;

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canAccessPathForRole(user.role, pathname)) {
      router.replace(resolvePostLoginRoute(user.role));
    }
  }, [pathname, router, user]);

  if (!user || !hasRouteAccess) {
    return null;
  }

  return (
    <CountyBrandingProvider>
      <div className="page-shell bg-transparent pb-20 md:pb-8">
        <StudentHeader />
        <div className="w-full px-4 pb-6 pt-0 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:items-start">
            <StudentSidebar />
            <div className="min-w-0">{children}</div>
          </div>
        </div>
        <StudentBottomNav />
      </div>
    </CountyBrandingProvider>
  );
}