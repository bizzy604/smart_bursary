import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] [&>svg]:size-3 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				neutral: "border-border bg-muted text-foreground/90",
				info: "border-info-100 bg-info-50 text-info-700",
				success: "border-emerald-100 bg-emerald-50 text-emerald-700",
				warning: "border-amber-100 bg-amber-50 text-amber-700",
				danger: "border-red-100 bg-red-50 text-red-700",
				default:
					"border-transparent bg-secondary text-white shadow-xs hover:bg-primary",
				secondary:
					"border-transparent bg-secondary/10 text-secondary hover:bg-secondary/30",
				destructive:
					"border-transparent bg-red-500 text-white shadow-xs hover:bg-red-700",
				outline: "border-border bg-transparent text-foreground/90",
			},
		},
		defaultVariants: {
			variant: "neutral",
		},
	},
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
	return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
