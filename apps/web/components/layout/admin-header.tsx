"use client";

import type { Route } from "next";
import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCounty } from "@/hooks/use-county";

interface AdminHeaderProps {
	homeHref: Route;
	portalLabel: string;
	userName: string;
	roleLabel: string;
	wardBadge?: string;
}

export function AdminHeader({ homeHref, portalLabel, wardBadge }: AdminHeaderProps) {
	const { county } = useCounty();

	return (
		<header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/65">
			<div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
				<SidebarTrigger className="-ml-1 text-gray-500 hover:text-brand-900" />

				<Link href={homeHref} className="hidden min-w-0 flex-col leading-tight md:flex">
					<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-county-primary">
						{county.name}
					</span>
					<span className="truncate text-sm font-semibold text-brand-900">{portalLabel}</span>
				</Link>

				{wardBadge ? (
					<Badge variant="outline" className="ml-2 hidden border-brand-200 bg-brand-50 text-[11px] font-semibold text-brand-700 md:inline-flex">
						{wardBadge}
					</Badge>
				) : null}

				<div className="ml-auto flex items-center gap-2">
					<div className="relative hidden w-80 max-w-md items-center md:flex">
						<Search aria-hidden className="absolute left-3 h-4 w-4 text-gray-400" />
						<Input
							type="search"
							placeholder="Search applications, students, references…"
							className="h-9 rounded-lg border-gray-200 bg-gray-50/70 pl-9 text-sm focus-visible:bg-white"
						/>
					</div>

					<button
						type="button"
						aria-label="Notifications"
						className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-900"
					>
						<Bell className="h-4 w-4" />
						<span aria-hidden className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-county-primary" />
					</button>
				</div>
			</div>
		</header>
	);
}
