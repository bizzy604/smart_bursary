import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
	title: string;
	description: string;
	icon?: LucideIcon;
	action?: ReactNode;
	className?: string;
	tone?: "subtle" | "brand";
}

export function EmptyState({
	title,
	description,
	icon: Icon = Inbox,
	action,
	className,
	tone = "subtle",
}: EmptyStateProps) {
	return (
		<section
			className={cn(
				"flex flex-col items-center rounded-2xl border border-dashed p-10 text-center",
				tone === "brand"
					? "border-brand-200 bg-gradient-to-b from-brand-50/80 to-white"
					: "border-gray-200 bg-white/60",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(
					"flex h-12 w-12 items-center justify-center rounded-2xl",
					tone === "brand"
						? "bg-brand-100/70 text-brand-700 ring-1 ring-brand-200"
						: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
				)}
			>
				<Icon className="h-5 w-5" />
			</span>
			<h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-brand-900">
				{title}
			</h2>
			<p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-gray-500">
				{description}
			</p>
			{action ? <div className="mt-5">{action}</div> : null}
		</section>
	);
}
