"use client";

import { useState, type MouseEvent } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useCounty } from "@/hooks/use-county";
import type { PreviewSection } from "@/lib/application-preview";
import { downloadApplicationPdf, requestApplicationPdf } from "@/lib/application-pdf-client";

interface ApplicationPdfButtonProps extends Omit<ButtonProps, "children"> {
	programName: string;
	reference: string;
	generatedAt: string;
	sections: PreviewSection[];
	label?: string;
}

export function ApplicationPdfButton({
	programName,
	reference,
	generatedAt,
	sections,
	label = "Download PDF",
	onClick,
	disabled,
	...buttonProps
}: ApplicationPdfButtonProps) {
	const { county } = useCounty();
	const [isDownloading, setIsDownloading] = useState(false);
	const hasPreviewSections = sections.length > 0;

	async function handleClick(event: MouseEvent<HTMLButtonElement>) {
		onClick?.(event);

		if (event.defaultPrevented || isDownloading) {
			return;
		}

		if (!hasPreviewSections) {
			return;
		}

		setIsDownloading(true);

		try {
			const blob = await requestApplicationPdf({
				countyName: county.name,
				fundName: county.fundName,
				primaryColor: county.primaryColor,
				legalReference: county.legalReference,
				programName,
				reference,
				generatedAt,
				sections,
			});

			if (!blob) {
				return;
			}

			downloadApplicationPdf(blob, reference);
		} finally {
			setIsDownloading(false);
		}
	}

	return (
		<Button
			{...buttonProps}
			disabled={disabled || isDownloading || !hasPreviewSections}
			onClick={handleClick}
		>
			{isDownloading ? "Preparing PDF..." : label}
		</Button>
	);
}
