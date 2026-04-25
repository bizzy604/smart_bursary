"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const opsNavItems = [
  { href: "/tenants", label: "Tenants" },
  { href: "/health", label: "System Health" },
] as const;

export function OpsSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset" className="border-r border-brand-100 bg-white/95 text-gray-900 shadow-xs backdrop-blur-sm">
      <SidebarHeader>
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-county-primary">
          Platform Operator
        </p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {opsNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href} className={cn("truncate", isActive && "font-medium")}>
                        {item.label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">
          Multi-tenant oversight
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
