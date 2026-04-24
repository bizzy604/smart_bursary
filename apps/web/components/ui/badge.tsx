import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
	{
		variants: {
			variant: {
				neutral: "border-gray-300 bg-gray-100 text-gray-700",
				info: "border-info-100 bg-info-50 text-info-700",
				success: "border-success-100 bg-success-50 text-success-700",
				warning: "border-warning-100 bg-warning-50 text-warning-700",
				danger: "border-danger-100 bg-danger-50 text-danger-700",
				default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
				secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
				outline: "text-foreground",
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
