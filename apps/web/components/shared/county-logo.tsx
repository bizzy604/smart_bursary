import { cn } from "@/lib/utils";

interface CountyLogoProps {
	label: string;
	className?: string;
}

export function CountyLogo({ label, className }: CountyLogoProps) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-flex h-10 w-10 items-center justify-center rounded-full bg-county-primary text-sm font-bold text-county-primary-text shadow-sm",
				className,
			)}
		>
			{label}
		</span>
	);
}

