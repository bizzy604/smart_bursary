"use client";

import Link from "next/link";
import { useCounty } from "@/hooks/use-county";
import { CountyLogo } from "@/components/shared/county-logo";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function StudentHeader() {
	const { county } = useCounty();

	return (
		<header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur-sm">
			<div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-3">
					<SidebarTrigger />
					<Link href="/dashboard" className="flex items-center gap-3">
					<CountyLogo label={county.logoText} />
					<div>
						<p className="font-display text-sm font-bold text-brand-900 sm:text-base">{county.name}</p>
						<p className="text-xs text-gray-600">{county.fundName}</p>
					</div>
					</Link>
				</div>

				<div className="text-right">
					<p className="text-sm font-semibold text-brand-900">Aisha Lokiru</p>
					<p className="text-xs text-gray-500">Student Applicant</p>
				</div>
			</div>
		</header>
	);
}

