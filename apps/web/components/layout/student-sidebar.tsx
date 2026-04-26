"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CountyLogo } from "@/components/shared/county-logo";
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
import { useCounty } from "@/hooks/use-county";
import { studentNavigationItems } from "@/lib/student-navigation";

export function StudentSidebar() {
	const pathname = usePathname();
	const { county } = useCounty();

	return (
		<Sidebar
			collapsible="icon"
			variant="inset"
			className="border-r border-border/80 bg-background text-foreground"
		>
			<SidebarHeader className="border-b border-border/70 pb-3">
				<div className="flex items-center gap-3 px-1.5 py-1.5">
					<CountyLogo label={county.logoText} />
					<div className="min-w-0 group-data-[collapsible=icon]:hidden">
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-county-primary">
							{county.name}
						</p>
						<h2 className="truncate font-serif text-[15px] font-semibold leading-tight text-primary">
							{county.fundName}
						</h2>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
						Workspace
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{studentNavigationItems.map((item) => {
								const Icon = item.icon;
								const isActive =
									pathname === item.href || pathname.startsWith(`${item.href}/`);

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
			</SidebarContent>

			<SidebarSeparator />
			<SidebarFooter className="pt-2">
				<SidebarUserMenu />
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
