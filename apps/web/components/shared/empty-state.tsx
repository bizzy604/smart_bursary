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
					? "border-secondary/40 bg-gradient-to-b from-secondary/10 to-white"
					: "border-border bg-background/60",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(
					"flex h-12 w-12 items-center justify-center rounded-2xl",
					tone === "brand"
						? "bg-secondary/30 text-secondary ring-1 ring-secondary/40"
						: "bg-muted text-muted-foreground ring-1 ring-border",
				)}
			>
				<Icon className="h-5 w-5" />
			</span>
			<h2 className="mt-4 font-serif text-lg font-semibold tracking-tight text-primary">
				{title}
			</h2>
			<p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
				{description}
			</p>
			{action ? <div className="mt-5">{action}</div> : null}
		</section>
	);
}
