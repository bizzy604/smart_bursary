"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useApplication } from "@/hooks/use-application";
import { useCounty } from "@/hooks/use-county";
import { toPreviewSections } from "@/lib/application-preview";
import { downloadApplicationPdf, requestApplicationPdf, requestApplicationPdfFromBackend } from "@/lib/application-pdf-client";
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
	const { getProgramById, submitDraftApplication, getApplicationByProgramId, isLoading, error } = useApplication();
	const hydrateProgram = useApplicationWizardStore((state) => state.hydrateProgram);
	const programState = useApplicationWizardStore((state) => state.programs[params.programId]);
	const [agreedToDeclaration, setAgreedToDeclaration] = useState(false);
	const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(true);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submissionError, setSubmissionError] = useState<string | null>(null);
	const [confirmSubmit, setConfirmSubmit] = useState(false);

	const submitApplication = async () => {
		setSubmissionError(null);
		setIsSubmitting(true);
		try {
			const result = await submitDraftApplication({
				programId: params.programId,
				programName: program?.name ?? "",
				requestedKes,
				sectionData: programState?.sectionData as Record<string, unknown>,
			});
			toast.success("Application submitted", {
				description: "You'll be redirected to your application status page.",
			});
			router.push(`/applications/${result.id}?submitted=1` as Route);
		} catch (reason: unknown) {
			const message = reason instanceof Error ? reason.message : "Failed to submit application.";
			setSubmissionError(message);
			toast.error("Submission failed", { description: message });
		} finally {
			setIsSubmitting(false);
			setConfirmSubmit(false);
		}
	};

	useEffect(() => {
		hydrateProgram(params.programId);
	}, [hydrateProgram, params.programId]);

	const program = getProgramById(params.programId);
	const existingApplication = getApplicationByProgramId(params.programId);
	const isAlreadySubmitted = existingApplication?.status === "SUBMITTED";
	const [previewGeneratedAt] = useState(() => existingApplication?.updatedAt ?? new Date().toISOString());
	const [countyLogoUrl, setCountyLogoUrl] = useState<string | undefined>(undefined);

	// Fetch county branding to get logo URL
	useEffect(() => {
		async function fetchBranding() {
			try {
				const response = await fetch("/api/v1/admin/settings/branding");
				if (response.ok) {
					const data = await response.json();
					if (data.logoUrl) {
						setCountyLogoUrl(data.logoUrl);
					}
				}
			} catch {
				// Branding fetch failed, continue without logo
			}
		}
		void fetchBranding();
	}, []);

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
	const applicationId = existingApplication?.id;
	const canSubmit = incompleteSections.length === 0 && agreedToDeclaration && !isAlreadySubmitted && !isSubmitting;

	useEffect(() => {
		let nextPreviewUrl: string | null = null;
		let isCancelled = false;

		async function loadPreviewPdf() {
			if (!applicationId || !program || previewSections.length === 0) {
				setPreviewPdfUrl(null);
				setIsPreviewLoading(false);
				return;
			}

			setIsPreviewLoading(true);

			const blob = await requestApplicationPdfFromBackend(applicationId);

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
	}, [applicationId]);

	if (!programState) {
		return (
			<section className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
				Loading preview...
			</section>
		);
	}

	if (isLoading) {
		return (
			<section className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
				Loading application context...
			</section>
		);
	}

	if (error) {
		return (
			<section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
				{error}
			</section>
		);
	}

	if (!program) {
		return (
			<section className="rounded-2xl border border-border bg-background p-6">
				<h2 className="font-serif text-xl font-semibold text-primary">Program not found</h2>
				<p className="mt-2 text-sm text-muted-foreground">The requested program is unavailable.</p>
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
			<section className="rounded-2xl border border-county-primary/20 bg-background p-5 shadow-xs">
				<h2 className="font-serif text-2xl font-semibold text-primary">Review Your Application</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					This is how your completed form will look. Download a copy for your records before final submission.
				</p>
			</section>

			{incompleteSections.length > 0 ? (
				<section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
					<h3 className="font-serif text-lg font-semibold text-amber-700">
						Complete All Sections Before Submission
					</h3>
					<p className="mt-2 text-sm text-amber-700">Finish the sections below to unlock final submission.</p>
					<ul className="mt-3 space-y-1 text-sm text-amber-700">
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
				<article className="rounded-2xl border border-border bg-background p-4 shadow-xs">
					<div className="mb-3 flex items-center justify-between gap-2">
						<p className="text-xs font-medium uppercase tracking-[0.14em] text-county-primary">Form Preview</p>
						<p className="text-xs text-muted-foreground">Reference: {reference}</p>
					</div>

					{isPreviewLoading ? (
						<div className="flex h-[70dvh] items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
							Generating PDF preview...
						</div>
					) : previewPdfUrl ? (
						<iframe
							title="Application PDF preview"
							src={previewPdfUrl}
							className="h-[70dvh] w-full rounded-xl border border-border bg-muted"
						/>
					) : (
						<div className="flex h-[70dvh] items-center justify-center rounded-xl border border-red-100 bg-red-50 px-6 text-center text-sm text-red-700">
							PDF preview is unavailable right now. You can still continue editing or try downloading again.
						</div>
					)}
				</article>

				<aside className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-xs lg:sticky lg:top-24 lg:h-fit">
					<div className="rounded-xl bg-secondary/10 p-3">
						<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Program</p>
						<p className="mt-1 font-semibold text-primary">{program.name}</p>
						<p className="mt-2 text-sm text-muted-foreground">Requested: {formatCurrencyKes(requestedKes)}</p>
					</div>

					<div className="space-y-2 text-sm text-foreground/90">
						<label className="flex items-start gap-2">
							<input
								type="checkbox"
								checked={agreedToDeclaration}
								onChange={(event) => setAgreedToDeclaration(event.target.checked)}
								className="mt-0.5 h-4 w-4 rounded border-border"
								disabled={isAlreadySubmitted}
							/>
							<span>I declare that the information given is true to the best of my knowledge.</span>
						</label>
					</div>

					{submissionError ? (
						<p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
							{submissionError}
						</p>
					) : null}

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
									let blob: Blob | null = null;
									
									if (applicationId) {
										blob = await requestApplicationPdfFromBackend(applicationId);
									} else {
										blob = await requestApplicationPdf({
											countyName: county.name,
											fundName: county.fundName,
											primaryColor: county.primaryColor,
											legalReference: county.legalReference,
											programName: program.name,
											reference,
											generatedAt: previewGeneratedAt,
											sections: previewSections,
											logoUrl: countyLogoUrl,
										});
									}

									if (blob) {
										downloadApplicationPdf(blob, reference);
									}
								} catch {
									toast.error("Download failed", { description: "Failed to download PDF. Please try again." });
								} finally {
									setIsDownloading(false);
								}
							}}
							disabled={isDownloading}
						>
							{isDownloading ? "Downloading..." : "Download PDF"}
						</Button>

						<Button
							className="w-full"
							disabled={!canSubmit}
							onClick={() => {
								if (!canSubmit) return;
								setConfirmSubmit(true);
							}}
						>
							{isSubmitting ? "Submitting..." : "Submit Application"}
						</Button>

						{isAlreadySubmitted ? (
							<p className="text-xs text-emerald-700">This application was already submitted on your account.</p>
						) : null}
					</div>

					<Link href={`/apply/${params.programId}/section-f` as Route} className="inline-flex w-full">
						<Button variant="secondary" className="w-full">
							Back to Documents
						</Button>
					</Link>
				</aside>
			</section>

			<AlertDialog
				open={confirmSubmit}
				onOpenChange={(open) => !isSubmitting && setConfirmSubmit(open)}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Submit your application?</AlertDialogTitle>
						<AlertDialogDescription>
							Once submitted you cannot edit your application. Make sure all sections,
							documents, and the requested amount of {formatCurrencyKes(requestedKes)} are correct.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								disabled={isSubmitting}
								onClick={(event) => {
									event.preventDefault();
									void submitApplication();
								}}
							>
								{isSubmitting ? "Submitting..." : "Confirm submit"}
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
