"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { getAdminNavigationItems } from "@/lib/admin-navigation";
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

interface AdminSidebarProps {
	role: Extract<AuthUser["role"], "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN">;
}

const PORTAL_LABEL_BY_ROLE: Record<AdminSidebarProps["role"], string> = {
	WARD_ADMIN: "Ward Portal",
	FINANCE_OFFICER: "County Finance Portal",
	COUNTY_ADMIN: "County Admin Portal",
};

export function AdminSidebar({ role }: AdminSidebarProps) {
	const pathname = usePathname();
	const navigationItems = getAdminNavigationItems(role);

	return (
		<Sidebar
			collapsible="icon"
			variant="inset"
			className="border-r border-brand-100 bg-white/95 text-gray-900 shadow-xs backdrop-blur-sm"
		>
			<SidebarHeader>
				<p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-county-primary">
					{PORTAL_LABEL_BY_ROLE[role]}
				</p>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navigationItems.map((item) => {
								const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
											<Link href={item.href}>{item.label}</Link>
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
					Role-scoped workspace
				</div>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
