import type { PreviewSection } from "@/lib/application-preview";

export interface ApplicationPdfPayload {
	countyName: string;
	fundName: string;
	primaryColor?: string;
	legalReference?: string;
	programName: string;
	reference: string;
	generatedAt: string;
	sections: PreviewSection[];
	logoUrl?: string;
}

export async function requestApplicationPdf(payload: ApplicationPdfPayload): Promise<Blob | null> {
	const response = await fetch("/api/applications/preview/pdf", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		return null;
	}

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.startsWith("application/pdf")) {
		return null;
	}

	return response.blob();
}

export async function requestApplicationPdfFromBackend(applicationId: string): Promise<Blob | null> {
	// Use the same-origin Next.js route that already authenticates against the
	// session, fetches the real application + branding payload, and renders a
	// proper PDF via @react-pdf/renderer.
	const response = await fetch(`/api/applications/${applicationId}/pdf`, {
		method: "GET",
	});

	if (!response.ok) {
		return null;
	}

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.startsWith("application/pdf")) {
		// The server may have fallen back to HTML; treat that as a failure so
		// callers don't end up downloading HTML disguised as a PDF.
		return null;
	}

	return response.blob();
}

export function getApplicationPdfFilename(reference: string): string {
	return `${reference.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
}

export function downloadApplicationPdf(blob: Blob, reference: string): void {
	const downloadUrl = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = downloadUrl;
	anchor.download = getApplicationPdfFilename(reference);
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(downloadUrl);
}
