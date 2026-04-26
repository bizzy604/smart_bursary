import Link from "next/link";
import type { Route } from "next";

export interface StepItem {
	key: string;
	label: string;
	href: Route;
}

interface StepProgressProps {
	steps: StepItem[];
	currentKey: string;
	completedKeys: string[];
}

export function StepProgress({ steps, currentKey, completedKeys }: StepProgressProps) {
	const currentIndex = Math.max(
		steps.findIndex((step) => step.key === currentKey),
		0,
	);
	const progress = ((currentIndex + 1) / steps.length) * 100;

	return (
		<section className="space-y-3 rounded-2xl border border-county-primary/20 bg-background p-4 shadow-sm">
			<div className="space-y-1">
				<p className="text-xs font-medium uppercase tracking-[0.14em] text-county-primary">Application Steps</p>
				<h2 className="font-serif text-base font-semibold text-primary">
					Step {currentIndex + 1} of {steps.length}: {steps[currentIndex]?.label}
				</h2>
			</div>

			<div className="h-2 overflow-hidden rounded-full bg-muted">
				<div className="h-full rounded-full bg-county-primary transition-all duration-300" style={{ width: `${progress}%` }} />
			</div>

			<ol className="hidden gap-2 sm:grid sm:grid-cols-7">
				{steps.map((step, index) => {
					const isCurrent = step.key === currentKey;
					const isComplete = completedKeys.includes(step.key);

					return (
						<li key={step.key} className="min-w-0">
							{isComplete && !isCurrent ? (
								<Link
									href={step.href}
									className="block rounded-lg border border-green-200 bg-green-50 px-2 py-2 text-center text-xs font-medium text-green-700 hover:bg-green-100"
								>
									{index + 1}. {step.label}
								</Link>
							) : (
								<div
									className={[
										"rounded-lg border px-2 py-2 text-center text-xs font-medium",
										isCurrent
											? "border-county-primary bg-county-primary/10 text-county-primary"
											: "border-border bg-muted text-muted-foreground",
									].join(" ")}
								>
									{index + 1}. {step.label}
								</div>
							)}
						</li>
					);
				})}
			</ol>
		</section>
	);
}

