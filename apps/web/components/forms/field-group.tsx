import type { ReactNode } from "react";

interface FieldGroupProps {
	title: string;
	description?: string;
	children: ReactNode;
}

export function FieldGroup({ title, description, children }: FieldGroupProps) {
	return (
		<section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
			<header>
				<h3 className="font-display text-base font-semibold text-brand-900">{title}</h3>
				{description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
			</header>
			<div className="space-y-4">{children}</div>
		</section>
	);
}

