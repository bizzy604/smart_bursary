import type { ReactNode } from "react";

interface FieldGroupProps {
	title: string;
	description?: string;
	children: ReactNode;
}

export function FieldGroup({ title, description, children }: FieldGroupProps) {
	return (
		<section className="space-y-4 rounded-2xl border border-border bg-background p-4 sm:p-5">
			<header>
				<h3 className="font-serif text-base font-semibold text-primary">{title}</h3>
				{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
			</header>
			<div className="space-y-4">{children}</div>
		</section>
	);
}

