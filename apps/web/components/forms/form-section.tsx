"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { AutoSaveStatus } from "@/hooks/use-auto-save";

interface FormSectionProps {
	title: string;
	description: string;
	children: ReactNode;
	backHref?: Route;
	onNext: () => void;
	nextLabel?: string;
	saveStatus?: AutoSaveStatus;
	isNextDisabled?: boolean;
}

const statusLabel: Record<AutoSaveStatus, string> = {
	idle: "Not saved yet",
	saving: "Saving draft...",
	saved: "Draft saved",
};

export function FormSection({
	title,
	description,
	children,
	backHref,
	onNext,
	nextLabel = "Save and Continue",
	saveStatus = "idle",
	isNextDisabled = false,
}: FormSectionProps) {
	return (
		<section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
			<header className="space-y-1">
				<h2 className="font-display text-xl font-semibold text-brand-900">{title}</h2>
				<p className="text-sm text-gray-600">{description}</p>
			</header>

			<div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
				{statusLabel[saveStatus]}
			</div>

			<div className="space-y-4">{children}</div>

			<footer className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
				{backHref ? (
					<Link href={backHref} className="inline-flex w-full sm:w-auto">
						<Button variant="secondary" className="w-full sm:w-auto">
							Back
						</Button>
					</Link>
				) : (
					<span />
				)}

				<Button onClick={onNext} disabled={isNextDisabled} className="w-full sm:w-auto">
					{nextLabel}
				</Button>
			</footer>
		</section>
	);
}

