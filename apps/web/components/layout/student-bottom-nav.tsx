"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";

const navigationItems: Array<{ href: Route; label: string }> = [
	{ href: "/dashboard", label: "Home" },
	{ href: "/programs", label: "Programs" },
	{ href: "/applications", label: "Applications" },
	{ href: "/profile", label: "Profile" },
];

export function StudentBottomNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur-sm md:hidden">
			<ul className="mx-auto grid max-w-2xl grid-cols-4">
				{navigationItems.map((item) => {
					const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

					return (
						<li key={item.href}>
							<Link
								href={item.href}
								className={cn(
									"flex flex-col items-center py-3 text-xs font-medium transition-colors",
									isActive ? "text-brand-900" : "text-gray-500 hover:text-brand-700",
								)}
							>
								<span className={cn("mb-1 h-1.5 w-1.5 rounded-full", isActive ? "bg-accent-500" : "bg-transparent")} />
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

