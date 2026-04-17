"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const opsNavItems = [
  { href: "/tenants", label: "Tenants" },
  { href: "/health", label: "System Health" },
] as const;

export default function OpsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <CountyBrandingProvider>
      <div className="page-shell county-pattern bg-transparent pb-6">
        <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur-sm">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Platform Operator</p>
              <h1 className="font-display text-lg font-semibold text-brand-900">Operations Console</h1>
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
          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
            <aside className="hidden md:sticky md:top-[74px] md:block md:h-[calc(100dvh-74px)] md:self-start">
              <div className="flex h-full min-h-full flex-col rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Ops Navigation</p>
                <nav className="mt-4 flex-1 overflow-y-auto pr-1">
                  <ul className="space-y-1">
                    {opsNavItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive ? "bg-brand-100 text-brand-900" : "text-gray-700 hover:bg-brand-50 hover:text-brand-900",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </aside>
            <main className="min-w-0 space-y-5">{children}</main>
          </div>
        </div>
      </div>
    </CountyBrandingProvider>
  );
}