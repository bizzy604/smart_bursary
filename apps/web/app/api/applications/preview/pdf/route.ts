import { NextResponse } from "next/server";

import { renderApplicationPdf } from "@/lib/application-pdf";
import type { PreviewSection } from "@/lib/application-preview";
import { countyBranding } from "@/lib/student-data";

export const runtime = "nodejs";

type PreviewPdfPayload = {
	countyName?: string;
	fundName?: string;
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

	const pdfBuffer = await renderApplicationPdf({
		countyName: body.countyName ?? countyBranding.name,
		fundName: body.fundName ?? countyBranding.fundName,
		programName: body.programName,
		reference: body.reference,
		generatedAt: body.generatedAt ?? new Date().toISOString(),
		sections: body.sections,
	});

	const safeReference = body.reference.replace(/[^A-Za-z0-9_-]/g, "_");

	return new NextResponse(new Blob([pdfBuffer], { type: "application/pdf" }), {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename=\"${safeReference}.pdf\"`,
		},
	});
}