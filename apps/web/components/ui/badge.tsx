import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] [&>svg]:size-3 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				neutral: "border-gray-200 bg-gray-50 text-gray-700",
				info: "border-info-100 bg-info-50 text-info-700",
				success: "border-success-100 bg-success-50 text-success-700",
				warning: "border-warning-100 bg-warning-50 text-warning-700",
				danger: "border-danger-100 bg-danger-50 text-danger-700",
				default:
					"border-transparent bg-brand-700 text-white shadow-xs hover:bg-brand-900",
				secondary:
					"border-transparent bg-brand-50 text-brand-800 hover:bg-brand-100",
				destructive:
					"border-transparent bg-danger-500 text-white shadow-xs hover:bg-danger-700",
				outline: "border-gray-200 bg-transparent text-gray-700",
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
