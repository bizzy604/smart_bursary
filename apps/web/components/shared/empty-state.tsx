import type { ReactNode } from "react";

interface EmptyStateProps {
	title: string;
	description: string;
	action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
	return (
		<section className="rounded-xl border border-dashed border-brand-300 bg-brand-50 p-8 text-center">
			<h2 className="font-display text-xl font-semibold text-brand-900">{title}</h2>
			<p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">{description}</p>
			{action ? <div className="mt-4">{action}</div> : null}
		</section>
	);
}

