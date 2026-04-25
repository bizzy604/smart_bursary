"use client";

import { Bell, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCounty } from "@/hooks/use-county";

export function StudentHeader() {
	const { county } = useCounty();

	return (
		<header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/65">
			<div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
				<SidebarTrigger className="-ml-1 text-gray-500 hover:text-brand-900" />

				<div className="hidden min-w-0 flex-col leading-tight md:flex">
					<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-county-primary">
						{county.name}
					</span>
					<span className="truncate text-sm font-semibold text-brand-900">{county.fundName}</span>
				</div>

				<div className="ml-auto flex items-center gap-2">
					<div className="relative hidden w-72 max-w-xs items-center md:flex">
						<Search aria-hidden className="absolute left-3 h-4 w-4 text-gray-400" />
						<Input
							type="search"
							placeholder="Search programs, applications…"
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
