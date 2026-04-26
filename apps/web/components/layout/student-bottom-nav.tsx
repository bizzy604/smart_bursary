"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { studentNavigationItems } from "@/lib/student-navigation";
import { cn } from "@/lib/utils";

export function StudentBottomNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary/30 bg-background/95 backdrop-blur-sm md:hidden">
			<ul className="mx-auto grid max-w-2xl grid-cols-4">
				{studentNavigationItems.map((item) => {
					const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

					return (
						<li key={item.href}>
							<Link
								href={item.href}
								className={cn(
									"flex flex-col items-center py-3 text-xs font-medium transition-colors",
									isActive ? "text-primary" : "text-muted-foreground hover:text-secondary",
								)}
							>
								<span className={cn("mb-1 h-1.5 w-1.5 rounded-full", isActive ? "bg-accent" : "bg-transparent")} />
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

