import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				primary: "bg-county-primary text-county-primary-text hover:brightness-95",
				secondary: "bg-brand-100 text-brand-900 hover:bg-brand-300",
				outline: "border border-gray-300 bg-white text-gray-800 hover:border-brand-300 hover:bg-brand-50",
				ghost: "bg-transparent text-brand-700 hover:bg-brand-50",
				danger: "bg-danger-500 text-white hover:bg-danger-700",
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				sm: "h-9 px-3",
				md: "h-11 px-5",
				lg: "h-12 px-6 text-base",
				icon: "h-9 w-9",
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
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp ref={ref} className={cn(buttonVariants({ variant, size, fullWidth }), className)} {...props} />
		);
	},
);
Button.displayName = "Button";

export { buttonVariants };
