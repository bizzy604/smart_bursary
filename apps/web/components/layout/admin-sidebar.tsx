"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countyNavigationItems, wardNavigationItems } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
	variant: "ward" | "county";
}

export function AdminSidebar({ variant }: AdminSidebarProps) {
	const pathname = usePathname();
	const navigationItems = variant === "ward" ? wardNavigationItems : countyNavigationItems;

	return (
		<aside className="hidden md:sticky md:top-[74px] md:block md:h-[calc(100dvh-74px)] md:self-start">
			<div className="flex h-full min-h-full w-[240px] flex-col rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-xs">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">
					{variant === "ward" ? "Ward Portal" : "County Portal"}
				</p>
				<nav className="mt-4 flex-1 overflow-y-auto pr-1">
					<ul className="space-y-1">
						{navigationItems.map((item) => {
							const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

							return (
								<li key={item.href}>
									<Link
										href={item.href}
										className={cn(
											"flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
											isActive
												? "bg-brand-100 text-brand-900"
												: "text-gray-700 hover:bg-brand-50 hover:text-brand-900",
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
	);
}
