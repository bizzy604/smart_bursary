import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
	eyebrow?: string;
	title: string;
	description?: string;
	icon?: LucideIcon;
	actions?: ReactNode;
	tone?: "plain" | "branded";
	className?: string;
}

export function PageHeader({
	eyebrow,
	title,
	description,
	icon: Icon,
	actions,
	tone = "plain",
	className,
}: PageHeaderProps) {
	if (tone === "branded") {
		return (
			<section
				className={cn(
					"relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-secondary to-secondary p-6 text-white shadow-sm",
					className,
				)}
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-25"
					style={{
						backgroundImage:
							"radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)",
						backgroundSize: "20px 20px",
					}}
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/80 blur-3xl"
				/>
				<div className="relative flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0 max-w-2xl space-y-2">
						{eyebrow ? (
							<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/40">
								{eyebrow}
							</p>
						) : null}
						<h1 className="font-serif text-[28px] font-semibold leading-tight tracking-tight">
							{title}
						</h1>
						{description ? (
							<p className="max-w-xl text-sm leading-relaxed text-secondary/10">
								{description}
							</p>
						) : null}
					</div>
					{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
				</div>
			</section>
		);
	}

	return (
		<section
			className={cn(
				"flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5",
				className,
			)}
		>
			<div className="flex min-w-0 items-start gap-3">
				{Icon ? (
					<span
						aria-hidden
						className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary ring-1 ring-secondary/30"
					>
						<Icon className="h-4 w-4" />
					</span>
				) : null}
				<div className="min-w-0 space-y-1">
					{eyebrow ? (
						<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-county-primary">
							{eyebrow}
						</p>
					) : null}
					<h1 className="font-serif text-[24px] font-semibold leading-tight tracking-tight text-primary">
						{title}
					</h1>
					{description ? (
						<p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
					) : null}
				</div>
			</div>
			{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
		</section>
	);
}
