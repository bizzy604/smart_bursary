"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useCounty } from "@/hooks/use-county";
import { toPreviewSections } from "@/lib/application-preview";
import { downloadApplicationPdf, requestApplicationPdf } from "@/lib/application-pdf-client";
import { useStudentApplicationStore } from "@/store/student-application-store";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

interface ApplicationPdfButtonProps extends Omit<ButtonProps, "children"> {
	applicationId: string;
	programId: string;
	programName: string;
	reference: string;
	generatedAt: string;
	label?: string;
}

export function ApplicationPdfButton({
	applicationId,
	programId,
	programName,
	reference,
	generatedAt,
	label = "Download PDF",
	onClick,
	disabled,
	...buttonProps
}: ApplicationPdfButtonProps) {
	const { county } = useCounty();
	const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
	const programState = useApplicationWizardStore((state) => state.programs[programId]);
	const submission = useStudentApplicationStore((state) => state.submissionsByProgram[programId]);
	const [isDownloading, setIsDownloading] = useState(false);

	useEffect(() => {
		hydrateProgram(programId);
	}, [hydrateProgram, programId]);

	const previewSections = useMemo(() => {
		if (submission?.previewSections?.length) {
			return submission.previewSections;
		}

		if (!programState) {
			return [];
		}

		return toPreviewSections(programState.sectionData as Record<string, unknown>);
	}, [programState, submission?.previewSections]);

	const fallbackHref = `/applications/${applicationId}/pdf?download=true`;

	async function handleClick(event: MouseEvent<HTMLButtonElement>) {
		onClick?.(event);

		if (event.defaultPrevented || isDownloading) {
			return;
		}

		if (!previewSections.length) {
			window.location.assign(fallbackHref);
			return;
		}

		setIsDownloading(true);

		try {
			const blob = await requestApplicationPdf({
				countyName: county.name,
				fundName: county.fundName,
				programName,
				reference,
				generatedAt,
				sections: previewSections,
			});

			if (!blob) {
				window.location.assign(fallbackHref);
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
			disabled={disabled || isDownloading}
			onClick={handleClick}
		>
			{isDownloading ? "Preparing PDF..." : label}
		</Button>
	);
}
