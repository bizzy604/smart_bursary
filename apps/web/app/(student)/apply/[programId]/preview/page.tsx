"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useApplication } from "@/hooks/use-application";
import { useCounty } from "@/hooks/use-county";
import { toPreviewSections } from "@/lib/application-preview";
import { downloadApplicationPdf, requestApplicationPdf } from "@/lib/application-pdf-client";
import { formatCurrencyKes } from "@/lib/format";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

const sectionOrder = ["section-a", "section-b", "section-c", "section-d", "section-e", "section-f"] as const;

const sectionName: Record<(typeof sectionOrder)[number], string> = {
	"section-a": "Personal",
	"section-b": "Amounts",
	"section-c": "Family",
	"section-d": "Financial",
	"section-e": "Disclosures",
	"section-f": "Documents",
};

export default function PreviewAndSubmitPage() {
	const params = useParams<{ programId: string }>();
	const router = useRouter();
	const { county } = useCounty();
	const { getProgramById, submitDraftApplication, getApplicationByProgramId } = useApplication();
	const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
	const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
	const [agreedToDeclaration, setAgreedToDeclaration] = useState(false);
	const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(true);
	const [isDownloading, setIsDownloading] = useState(false);

	useEffect(() => {
		hydrateProgram(params.programId);
	}, [hydrateProgram, params.programId]);

	const program = getProgramById(params.programId);
	const existingApplication = getApplicationByProgramId(params.programId);
	const isAlreadySubmitted = existingApplication?.status === "SUBMITTED";
	const [previewGeneratedAt] = useState(() => existingApplication?.updatedAt ?? new Date().toISOString());

	const incompleteSections = useMemo(() => {
		if (!programState) {
			return sectionOrder;
		}

		return sectionOrder.filter((section) => !programState.completion[section]);
	}, [programState]);

	const previewSections = useMemo(() => {
		if (!programState) {
			return [];
		}

		return toPreviewSections(programState.sectionData as Record<string, unknown>);
	}, [programState]);

	const requestedKes = useMemo(() => {
		if (!programState) {
			return 0;
		}

		const sectionB = (programState.sectionData["section-b"] ?? {}) as { requestedKes?: string | number };
		return Number(sectionB.requestedKes ?? 0);
	}, [programState]);

	const reference = existingApplication?.reference ?? `TRK-${new Date().getFullYear()}-PREVIEW`;
	const canSubmit = incompleteSections.length === 0 && agreedToDeclaration && !isAlreadySubmitted;

	useEffect(() => {
		let nextPreviewUrl: string | null = null;
		let isCancelled = false;

		async function loadPreviewPdf() {
			if (!program || previewSections.length === 0) {
				setPreviewPdfUrl(null);
				setIsPreviewLoading(false);
				return;
			}

			setIsPreviewLoading(true);

			const blob = await requestApplicationPdf({
				countyName: county.name,
				fundName: county.fundName,
				programName: program.name,
				reference,
				generatedAt: previewGeneratedAt,
				sections: previewSections,
			});

			if (isCancelled) {
				return;
			}

			if (!blob) {
				setPreviewPdfUrl(null);
				setIsPreviewLoading(false);
				return;
			}

			nextPreviewUrl = URL.createObjectURL(blob);
			setPreviewPdfUrl(nextPreviewUrl);
			setIsPreviewLoading(false);
		}

		void loadPreviewPdf();

		return () => {
			isCancelled = true;
			if (nextPreviewUrl) {
				URL.revokeObjectURL(nextPreviewUrl);
			}
		};
	}, [county.fundName, county.name, previewGeneratedAt, previewSections, program, reference]);

	if (!programState) {
		return (
			<section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
				Loading preview...
			</section>
		);
	}

	if (!program) {
		return (
			<section className="rounded-2xl border border-gray-200 bg-white p-6">
				<h2 className="font-display text-xl font-semibold text-brand-900">Program not found</h2>
				<p className="mt-2 text-sm text-gray-600">The requested program is unavailable.</p>
				<div className="mt-4">
					<Link href="/programs">
						<Button>Back to Programs</Button>
					</Link>
				</div>
			</section>
		);
	}

	return (
		<main className="space-y-4">
			<section className="rounded-2xl border border-county-primary/20 bg-white p-5 shadow-xs">
				<h2 className="font-display text-2xl font-semibold text-brand-900">Review Your Application</h2>
				<p className="mt-2 text-sm text-gray-600">
					This is how your completed form will look. Download a copy for your records before final submission.
				</p>
			</section>

			{incompleteSections.length > 0 ? (
				<section className="rounded-2xl border border-warning-100 bg-warning-50 p-5">
					<h3 className="font-display text-lg font-semibold text-warning-700">
						Complete All Sections Before Submission
					</h3>
					<p className="mt-2 text-sm text-warning-700">Finish the sections below to unlock final submission.</p>
					<ul className="mt-3 space-y-1 text-sm text-warning-700">
						{incompleteSections.map((section) => (
							<li key={section}>- {sectionName[section]}</li>
						))}
					</ul>
					<div className="mt-4">
						<Link href={`/apply/${params.programId}/${incompleteSections[0]}` as Route}>
							<Button>Go to Next Incomplete Section</Button>
						</Link>
					</div>
				</section>
			) : null}

			<section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
				<article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
					<div className="mb-3 flex items-center justify-between gap-2">
						<p className="text-xs font-medium uppercase tracking-[0.14em] text-county-primary">Form Preview</p>
						<p className="text-xs text-gray-500">Reference: {reference}</p>
					</div>

					{isPreviewLoading ? (
						<div className="flex h-[70dvh] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
							Generating PDF preview...
						</div>
					) : previewPdfUrl ? (
						<iframe
							title="Application PDF preview"
							src={previewPdfUrl}
							className="h-[70dvh] w-full rounded-xl border border-gray-200 bg-gray-50"
						/>
					) : (
						<div className="flex h-[70dvh] items-center justify-center rounded-xl border border-danger-100 bg-danger-50 px-6 text-center text-sm text-danger-700">
							PDF preview is unavailable right now. You can still continue editing or try downloading again.
						</div>
					)}
				</article>

				<aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs lg:sticky lg:top-24 lg:h-fit">
					<div className="rounded-xl bg-brand-50 p-3">
						<p className="text-xs uppercase tracking-[0.12em] text-gray-500">Program</p>
						<p className="mt-1 font-semibold text-brand-900">{program.name}</p>
						<p className="mt-2 text-sm text-gray-600">Requested: {formatCurrencyKes(requestedKes)}</p>
					</div>

					<div className="space-y-2 text-sm text-gray-700">
						<label className="flex items-start gap-2">
							<input
								type="checkbox"
								checked={agreedToDeclaration}
								onChange={(event) => setAgreedToDeclaration(event.target.checked)}
								className="mt-0.5 h-4 w-4 rounded border-gray-300"
								disabled={isAlreadySubmitted}
							/>
							<span>I declare that the information given is true to the best of my knowledge.</span>
						</label>
					</div>

					<div className="space-y-2">
						<Button
							variant="outline"
							className="w-full"
							onClick={async () => {
								if (isDownloading) {
									return;
								}

								setIsDownloading(true);

								try {
									const blob = await requestApplicationPdf({
										countyName: county.name,
										fundName: county.fundName,
										programName: program.name,
										reference,
										generatedAt: previewGeneratedAt,
										sections: previewSections,
									});

									if (!blob) {
										return;
									}

									downloadApplicationPdf(blob, reference);
								} finally {
									setIsDownloading(false);
								}
							}}
						>
							{isDownloading ? "Preparing PDF..." : "Download / Print PDF"}
						</Button>

						<Button
							className="w-full"
							disabled={!canSubmit}
							onClick={() => {
								if (!canSubmit) {
									return;
								}

								const result = submitDraftApplication({
									programId: params.programId,
									programName: program.name,
									requestedKes,
									previewSections,
								});
								router.push(`/applications/${result.id}?submitted=1` as Route);
							}}
						>
							Submit Application
						</Button>

						{isAlreadySubmitted ? (
							<p className="text-xs text-success-700">This application was already submitted on your account.</p>
						) : null}
					</div>

					<Link href={`/apply/${params.programId}/section-f` as Route} className="inline-flex w-full">
						<Button variant="secondary" className="w-full">
							Back to Documents
						</Button>
					</Link>
				</aside>
			</section>
		</main>
	);
}
