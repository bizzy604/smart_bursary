import { cn } from "@/lib/utils";

interface StatsCardProps {
	label: string;
	value: string;
	hint: string;
	className?: string;
}

export function StatsCard({ label, value, hint, className }: StatsCardProps) {
	return (
		<article className={cn("rounded-xl border border-gray-200 bg-white p-5 shadow-xs", className)}>
			<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
			<p className="mt-3 font-display text-2xl font-bold text-brand-900">{value}</p>
			<p className="mt-1 text-sm text-gray-600">{hint}</p>
		</article>
	);
}

