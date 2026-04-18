import { NextResponse } from "next/server";

import { renderApplicationPdf } from "@/lib/application-pdf";
import { buildApplicationPreviewHtml } from "@/lib/application-preview";
import type { PreviewSection } from "@/lib/application-preview";

const DEFAULT_COUNTY_NAME = "County Government";
const DEFAULT_FUND_NAME = "Education Fund";
const DEFAULT_PRIMARY_COLOR = "#1E3A5F";
const DEFAULT_LEGAL_REFERENCE = "";

export const runtime = "nodejs";

type PreviewPdfPayload = {
	countyName?: string;
	fundName?: string;
	primaryColor?: string;
	legalReference?: string;
	programName?: string;
	reference?: string;
	generatedAt?: string;
	sections?: PreviewSection[];
};

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as PreviewPdfPayload | null;

	if (!body?.programName || !body?.reference || !Array.isArray(body.sections)) {
		return NextResponse.json(
			{ message: "Invalid payload. programName, reference, and sections are required." },
			{ status: 400 },
		);
	}

	const pdfPayload = {
		countyName: body.countyName ?? DEFAULT_COUNTY_NAME,
		fundName: body.fundName ?? DEFAULT_FUND_NAME,
		primaryColor: body.primaryColor ?? DEFAULT_PRIMARY_COLOR,
		legalReference: body.legalReference ?? DEFAULT_LEGAL_REFERENCE,
		programName: body.programName,
		reference: body.reference,
		generatedAt: body.generatedAt ?? new Date().toISOString(),
		sections: body.sections,
	};

	const safeReference = body.reference.replace(/[^A-Za-z0-9_-]/g, "_");

	try {
		const pdfBytes = await renderApplicationPdf(pdfPayload);

		return new NextResponse(pdfBytes, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename=\"${safeReference}.pdf\"`,
			},
		});
	} catch {
		const html = buildApplicationPreviewHtml({
			countyName: pdfPayload.countyName,
			fundName: pdfPayload.fundName,
			programName: pdfPayload.programName,
			reference: pdfPayload.reference,
			generatedAt: pdfPayload.generatedAt,
			sections: pdfPayload.sections,
		});

		return new NextResponse(html, {
			status: 200,
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				"Content-Disposition": `attachment; filename=\"${safeReference}.pdf\"`,
				"X-PDF-Fallback": "true",
			},
		});
	}
}