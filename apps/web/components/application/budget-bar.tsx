import { formatCurrencyKes, formatPercent } from "@/lib/format";

interface BudgetBarProps {
	programName: string;
	ceiling: number;
	allocated: number;
	disbursed: number;
}

function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, value));
}

export function BudgetBar({ programName, ceiling, allocated, disbursed }: BudgetBarProps) {
	const allocatedPercent = clampPercent((allocated / Math.max(1, ceiling)) * 100);
	const disbursedPercent = clampPercent((disbursed / Math.max(1, ceiling)) * 100);
	const remaining = Math.max(0, ceiling - allocated);

	return (
		<section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-xs">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Budget Utilization</p>
					<h2 className="mt-1 font-display text-lg font-semibold text-brand-900">{programName}</h2>
				</div>
				<p className="text-sm text-gray-600">Ceiling: {formatCurrencyKes(ceiling)}</p>
			</div>

			<div className="mt-4 h-4 overflow-hidden rounded-full bg-gray-200">
				<div className="relative h-full w-full">
					<div className="absolute inset-y-0 left-0 bg-brand-300" style={{ width: `${allocatedPercent}%` }} />
					<div className="absolute inset-y-0 left-0 bg-county-primary" style={{ width: `${disbursedPercent}%` }} />
				</div>
			</div>

			<div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
				<p>Allocated: <span className="font-semibold">{formatCurrencyKes(allocated)}</span> ({formatPercent(allocatedPercent)})</p>
				<p>Disbursed: <span className="font-semibold">{formatCurrencyKes(disbursed)}</span> ({formatPercent(disbursedPercent)})</p>
				<p>Remaining: <span className="font-semibold">{formatCurrencyKes(remaining)}</span></p>
			</div>
		</section>
	);
}
