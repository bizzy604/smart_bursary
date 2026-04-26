import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type StatsCardIntent = "neutral" | "brand" | "success" | "warning" | "danger";

interface StatsCardProps {
	label: string;
	value: string;
	hint: string;
	icon?: LucideIcon;
	intent?: StatsCardIntent;
	trend?: {
		direction: "up" | "down" | "flat";
		label: string;
	};
	className?: string;
}

const INTENT_STYLES: Record<
	StatsCardIntent,
	{ icon: string; ring: string; valueAccent: string }
> = {
	neutral: {
		icon: "bg-muted text-foreground/90 ring-1 ring-border",
		ring: "",
		valueAccent: "text-primary",
	},
	brand: {
		icon: "bg-secondary/10 text-secondary ring-1 ring-secondary/30",
		ring: "",
		valueAccent: "text-primary",
	},
	success: {
		icon: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
		ring: "",
		valueAccent: "text-emerald-700",
	},
	warning: {
		icon: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
		ring: "",
		valueAccent: "text-amber-700",
	},
	danger: {
		icon: "bg-red-50 text-red-700 ring-1 ring-red-100",
		ring: "",
		valueAccent: "text-red-700",
	},
};

const TREND_STYLES = {
	up: { Icon: ArrowUpRight, className: "bg-emerald-50 text-emerald-700" },
	down: { Icon: ArrowDownRight, className: "bg-red-50 text-red-700" },
	flat: { Icon: Minus, className: "bg-muted text-muted-foreground" },
} as const;

export function StatsCard({
	label,
	value,
	hint,
	icon: Icon,
	intent = "brand",
	trend,
	className,
}: StatsCardProps) {
	const intentStyle = INTENT_STYLES[intent];

	return (
		<article
			className={cn(
				"group relative overflow-hidden rounded-2xl border border-border/80 bg-background p-5 shadow-xs transition-shadow hover:shadow-sm",
				className,
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
					{label}
				</p>
				{Icon ? (
					<span
						aria-hidden
						className={cn(
							"flex h-9 w-9 items-center justify-center rounded-lg",
							intentStyle.icon,
						)}
					>
						<Icon className="h-4 w-4" />
					</span>
				) : null}
			</div>

			<p
				className={cn(
					"mt-3 font-serif text-[28px] font-semibold leading-none tracking-tight tabular-nums",
					intentStyle.valueAccent,
				)}
			>
				{value}
			</p>

			<div className="mt-2 flex items-center justify-between gap-2">
				<p className="text-[13px] leading-relaxed text-muted-foreground">{hint}</p>
				{trend ? (() => {
					const TrendStyle = TREND_STYLES[trend.direction];
					const TrendIcon = TrendStyle.Icon;
					return (
						<span
							className={cn(
								"inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
								TrendStyle.className,
							)}
						>
							<TrendIcon className="h-3 w-3" />
							{trend.label}
						</span>
					);
				})() : null}
			</div>
		</article>
	);
}
