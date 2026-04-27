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

	return response.blob();
}

export async function requestApplicationPdfFromBackend(applicationId: string): Promise<Blob | null> {
	const response = await fetch("/api/v1/applications/pdf", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ applicationId }),
	});

	if (!response.ok) {
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
