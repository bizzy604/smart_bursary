"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { Button } from "@/components/ui/button";
import { canAccessPathForRole, resolvePostLoginRoute } from "@/lib/role-routing";
import { useAuthStore } from "@/store/auth-store";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OpsSidebar } from "@/components/layout/ops-sidebar";

export default function OpsLayout({ children }: { children: ReactNode }) {
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
      <SidebarProvider defaultOpen>
        <OpsSidebar />
        <SidebarInset>
          <div className="page-shell county-pattern bg-transparent pb-6">
            <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur-sm">
              <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <div>
                  <div className="flex items-center gap-3">
                    <SidebarTrigger />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Platform Operator</p>
                      <h1 className="font-display text-lg font-semibold text-brand-900">Operations Console</h1>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-900">System Operator</p>
                    <p className="text-xs text-gray-500">Multi-tenant oversight</p>
                  </div>
                  <Button variant="outline" size="sm">Logout</Button>
                </div>
              </div>
            </header>

            <div className="w-full px-4 pb-6 pt-4 sm:px-6 lg:px-8">
              <main className="min-w-0 space-y-5">{children}</main>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </CountyBrandingProvider>
  );
}