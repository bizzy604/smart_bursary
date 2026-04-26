"use client";

import { Button } from "@/components/ui/button";
import { downloadTextFile, openPreviewHtml } from "@/lib/client-download";
import type { SupportingDocument } from "@/lib/review-types";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
	documents: SupportingDocument[];
}

const statusStyles: Record<SupportingDocument["status"], string> = {
	VERIFIED: "border-emerald-100 bg-emerald-50 text-emerald-700",
	PENDING_SCAN: "border-amber-100 bg-amber-50 text-amber-700",
	MISSING: "border-red-100 bg-red-50 text-red-700",
};

const statusLabel: Record<SupportingDocument["status"], string> = {
	VERIFIED: "Verified",
	PENDING_SCAN: "Pending Scan",
	MISSING: "Missing",
};

export function DocumentViewer({ documents }: DocumentViewerProps) {
	function buildDocumentBody(document: SupportingDocument): string {
		return [
			`Document ID: ${document.id}`,
			`Document Type: ${document.label}`,
			`Verification Status: ${statusLabel[document.status]}`,
			"",
			"This is a generated preview for the current frontend phase.",
			"Backend-integrated binary document streaming is connected in a subsequent API phase.",
		].join("\n");
	}

	function previewDocument(document: SupportingDocument): void {
		const content = buildDocumentBody(document)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll("\n", "<br/>");

		openPreviewHtml(
			document.label,
			`<main style=\"font-family:'Noto Sans',Arial,sans-serif;padding:24px;color:#111827\">` +
				`<h1 style=\"margin:0 0 8px;color:#0d2b4e\">${document.label}</h1>` +
				`<p style=\"margin:0 0 16px;color:#6b7280\">Status: ${statusLabel[document.status]}</p>` +
				`<article style=\"border:1px solid #d1d5db;border-radius:8px;padding:14px;background:#f9fafb;line-height:1.6\">${content}</article>` +
			"</main>",
		);
	}

	function downloadDocument(document: SupportingDocument): void {
		const normalizedLabel = document.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "");
		downloadTextFile(
			`${document.id}-${normalizedLabel}.txt`,
			buildDocumentBody(document),
			"text/plain;charset=utf-8",
		);
	}

	return (
		<section className="rounded-2xl border border-secondary/30 bg-background p-5 shadow-xs">
			<h3 className="font-serif text-lg font-semibold text-primary">Supporting Documents</h3>
			{documents.length === 0 ? (
				<p className="mt-3 text-sm text-muted-foreground">No supporting documents are available for this application yet.</p>
			) : null}
			<div className="mt-4 space-y-3">
				{documents.map((document) => {
					const isBlocked = document.status === "MISSING";

					return (
						<article key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted p-3">
							<div>
								<p className="text-sm font-semibold text-foreground">{document.label}</p>
								<span className={cn("mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", statusStyles[document.status])}>
									{statusLabel[document.status]}
								</span>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={isBlocked}
									onClick={() => {
										if (isBlocked) {
											return;
										}

										previewDocument(document);
									}}
								>
									View
								</Button>
								<Button
									variant="ghost"
									size="sm"
									disabled={isBlocked}
									onClick={() => {
										if (isBlocked) {
											return;
										}

										downloadDocument(document);
									}}
								>
									Download
								</Button>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}
