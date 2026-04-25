"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

import { SidebarUserMenu } from "@/components/layout/sidebar-user-menu";
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
	SidebarSeparator,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
	role: Extract<AuthUser["role"], "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN">;
}

const PORTAL_LABEL_BY_ROLE: Record<AdminSidebarProps["role"], string> = {
	WARD_ADMIN: "Ward Portal",
	FINANCE_OFFICER: "Finance Portal",
	COUNTY_ADMIN: "County Admin",
};

const PORTAL_TAGLINE_BY_ROLE: Record<AdminSidebarProps["role"], string> = {
	WARD_ADMIN: "Application reviews",
	FINANCE_OFFICER: "Disbursements & finance",
	COUNTY_ADMIN: "County operations",
};

export function AdminSidebar({ role }: AdminSidebarProps) {
	const pathname = usePathname();
	const navigationItems = getAdminNavigationItems(role);

	return (
		<Sidebar
			collapsible="icon"
			variant="inset"
			className="border-r border-gray-200/80 bg-white text-gray-900"
		>
			<SidebarHeader className="border-b border-gray-200/70 pb-3">
				<div className="flex items-center gap-3 px-1.5 py-1.5">
					<span
						aria-hidden
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm ring-1 ring-brand-900/10"
					>
						<Building2 className="h-4.5 w-4.5" />
					</span>
					<div className="min-w-0 group-data-[collapsible=icon]:hidden">
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-county-primary">
							{PORTAL_LABEL_BY_ROLE[role]}
						</p>
						<h2 className="truncate font-display text-[15px] font-semibold leading-tight text-brand-900">
							{PORTAL_TAGLINE_BY_ROLE[role]}
						</h2>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
						Navigation
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navigationItems.map((item) => {
								const Icon = item.icon;
								const isActive =
									pathname === item.href || pathname.startsWith(`${item.href}/`);

								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											tooltip={item.label}
											className="h-10 gap-3 rounded-lg text-[13px] font-medium text-gray-600 transition-colors hover:bg-brand-50/70 hover:text-brand-900 data-[active=true]:bg-brand-50 data-[active=true]:text-brand-900 data-[active=true]:shadow-[inset_2px_0_0_0] data-[active=true]:shadow-county-primary"
										>
											<Link href={item.href}>
												<Icon className="h-4 w-4 shrink-0 text-current opacity-80" />
												<span className="truncate">{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarSeparator />
			<SidebarFooter className="pt-2">
				<SidebarUserMenu />
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
