import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
	{
		variants: {
			variant: {
				primary: "bg-county-primary text-county-primary-text hover:brightness-95",
				secondary: "bg-brand-100 text-brand-900 hover:bg-brand-300",
				outline: "border border-gray-300 bg-white text-gray-800 hover:border-brand-300 hover:bg-brand-50",
				ghost: "bg-transparent text-brand-700 hover:bg-brand-50",
				danger: "bg-danger-500 text-white hover:bg-danger-700",
			},
			size: {
				sm: "h-9 px-3",
				md: "h-11 px-5",
				lg: "h-12 px-6 text-base",
			},
			fullWidth: {
				true: "w-full",
				false: "",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
			fullWidth: false,
		},
	},
);

export interface ButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, fullWidth, ...props }: ButtonProps) {
	return <button className={cn(buttonVariants({ variant, size, fullWidth }), className)} {...props} />;
}

