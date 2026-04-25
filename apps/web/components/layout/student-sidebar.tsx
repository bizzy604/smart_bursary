"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CountyLogo } from "@/components/shared/county-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useCounty } from "@/hooks/use-county";
import { studentNavigationItems } from "@/lib/student-navigation";

export function StudentSidebar() {
  const pathname = usePathname();
  const { county } = useCounty();

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="border-r border-brand-100 bg-white/95 text-gray-900 shadow-xs backdrop-blur-sm"
    >
      <SidebarHeader>
        <div className="flex items-center gap-3 px-1 py-1">
          <CountyLogo label={county.logoText} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-county-primary">
              Student Navigation
            </p>
            <h2 className="truncate font-display text-base font-semibold text-brand-900">
              {county.fundName}
            </h2>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {studentNavigationItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-accent-500/80" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
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
          County fund workspace
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
