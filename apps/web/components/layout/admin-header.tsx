"use client";

import Link from "next/link";
import type { Route } from "next";
import { CountyLogo } from "@/components/shared/county-logo";
import { Button } from "@/components/ui/button";
import { useCounty } from "@/hooks/use-county";

interface AdminHeaderProps {
	homeHref: Route;
	portalLabel: string;
	userName: string;
	roleLabel: string;
	wardBadge?: string;
}

export function AdminHeader({ homeHref, portalLabel, userName, roleLabel, wardBadge }: AdminHeaderProps) {
	const { county } = useCounty();

	return (
		<header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur-sm">
			<div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
				<Link href={homeHref} className="flex items-center gap-3">
					<CountyLogo label={county.logoText} />
					<div>
						<p className="font-display text-sm font-bold text-brand-900 sm:text-base">{county.name}</p>
						<p className="text-xs text-gray-600">{portalLabel}</p>
					</div>
				</Link>

				<div className="flex items-center gap-3">
					{wardBadge ? (
						<span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
							{wardBadge}
						</span>
					) : null}
					<div className="text-right">
						<p className="text-sm font-semibold text-brand-900">{userName}</p>
						<p className="text-xs text-gray-500">{roleLabel}</p>
					</div>
					<Button variant="outline" size="sm">Logout</Button>
				</div>
			</div>
		</header>
	);
}
