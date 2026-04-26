"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, ServerCog, Sparkles } from "lucide-react";

import { SidebarUserMenu } from "@/components/layout/sidebar-user-menu";
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

const opsNavItems = [
	{ href: "/tenants", label: "Tenants", icon: Building2 },
	{ href: "/health", label: "System Health", icon: Activity },
] as const;

export function OpsSidebar() {
	const pathname = usePathname();

	return (
		<Sidebar
			collapsible="icon"
			variant="inset"
			className="border-r border-border/80 bg-background text-foreground"
		>
			<SidebarHeader className="border-b border-border/70 pb-3">
				<div className="flex items-center gap-3 px-1.5 py-1.5">
					<span
						aria-hidden
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-primary text-white shadow-sm ring-1 ring-primary/10"
					>
						<ServerCog className="h-4 w-4" />
					</span>
					<div className="min-w-0 group-data-[collapsible=icon]:hidden">
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-county-primary">
							Platform Operator
						</p>
						<h2 className="truncate font-serif text-[15px] font-semibold leading-tight text-primary">
							Operations Console
						</h2>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
						Oversight
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{opsNavItems.map((item) => {
								const Icon = item.icon;
								const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											tooltip={item.label}
											className="h-10 gap-3 rounded-lg text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary/10 hover:text-primary data-[active=true]:bg-secondary/10 data-[active=true]:text-primary data-[active=true]:shadow-[inset_2px_0_0_0] data-[active=true]:shadow-county-primary"
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

				<SidebarGroup className="group-data-[collapsible=icon]:hidden">
					<SidebarGroupContent className="px-2">
						<div className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/10 via-white to-accent/10 p-3">
							<div className="flex items-center gap-2">
								<Sparkles className="h-4 w-4 text-county-primary" />
								<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
									Multi-tenant
								</p>
							</div>
							<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
								Cross-county oversight of tenants, plans, and platform health.
							</p>
						</div>
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
