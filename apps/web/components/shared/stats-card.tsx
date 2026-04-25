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
		icon: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
		ring: "",
		valueAccent: "text-brand-900",
	},
	brand: {
		icon: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
		ring: "",
		valueAccent: "text-brand-900",
	},
	success: {
		icon: "bg-success-50 text-success-700 ring-1 ring-success-100",
		ring: "",
		valueAccent: "text-success-700",
	},
	warning: {
		icon: "bg-warning-50 text-warning-700 ring-1 ring-warning-100",
		ring: "",
		valueAccent: "text-warning-700",
	},
	danger: {
		icon: "bg-danger-50 text-danger-700 ring-1 ring-danger-100",
		ring: "",
		valueAccent: "text-danger-700",
	},
};

const TREND_STYLES = {
	up: { Icon: ArrowUpRight, className: "bg-success-50 text-success-700" },
	down: { Icon: ArrowDownRight, className: "bg-danger-50 text-danger-700" },
	flat: { Icon: Minus, className: "bg-gray-100 text-gray-600" },
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
				"group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm",
				className,
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
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
					"mt-3 font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums",
					intentStyle.valueAccent,
				)}
			>
				{value}
			</p>

			<div className="mt-2 flex items-center justify-between gap-2">
				<p className="text-[13px] leading-relaxed text-gray-500">{hint}</p>
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
