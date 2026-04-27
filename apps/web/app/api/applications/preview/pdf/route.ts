/**
 * Purpose: Generate an in-memory PDF for the apply-flow preview when the caller
 *          provides the section data directly (i.e. before/while the draft
 *          application has not yet been created on the backend).
 * Why important: Returning HTML here would force the client to download an HTML
 *                file with a `.pdf` extension, breaking the download experience
 *                ("wrong file format" bug). We render real PDF bytes via
 *                @react-pdf/renderer so the produced file is a valid PDF that
 *                opens in any PDF viewer and includes the county logo, the
 *                application QR code, and the applicant's section details.
 * Used by: requestApplicationPdf() in apps/web/lib/application-pdf-client.ts
 *          (called from /apply/[programId]/preview when no applicationId yet).
 */
import QRCode from "qrcode";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { renderApplicationPdf } from "@/lib/application-pdf";
import type { PreviewSection } from "@/lib/application-preview";

export const runtime = "nodejs";

const DEFAULT_COUNTY_NAME = "County Government";
const DEFAULT_FUND_NAME = "Education Fund";
const DEFAULT_PRIMARY_COLOR = "#1E3A5F";
const DEFAULT_LEGAL_REFERENCE = "";

type PreviewPdfPayload = {
	countyName?: string;
	fundName?: string;
	primaryColor?: string;
	legalReference?: string;
	programName?: string;
	reference?: string;
	generatedAt?: string;
	sections?: PreviewSection[];
	logoUrl?: string;
};

async function fetchLogoAsDataUrl(logoUrl: string): Promise<string | undefined> {
	try {
		const response = await fetch(logoUrl, { cache: "no-store" });
		if (!response.ok) return undefined;
		const buffer = Buffer.from(await response.arrayBuffer());
		const contentType = response.headers.get("content-type") || "image/png";
		return `data:${contentType};base64,${buffer.toString("base64")}`;
	} catch {
		return undefined;
	}
}

export async function POST(request: Request) {
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ message: "Authentication required" }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as PreviewPdfPayload | null;

	if (!body?.programName || !body?.reference || !Array.isArray(body.sections)) {
		return NextResponse.json(
			{ message: "Invalid payload. programName, reference, and sections are required." },
			{ status: 400 },
		);
	}

	const qrCodeDataUrl = await QRCode.toDataURL(`REF:${body.reference}`, {
		width: 160,
		margin: 1,
		type: "image/png",
	});

	const logoDataUrl = body.logoUrl ? await fetchLogoAsDataUrl(body.logoUrl) : undefined;

	const safeReference = body.reference.replace(/[^A-Za-z0-9_-]/g, "_");

	try {
		const pdfBytes = await renderApplicationPdf({
			countyName: body.countyName ?? DEFAULT_COUNTY_NAME,
			fundName: body.fundName ?? DEFAULT_FUND_NAME,
			primaryColor: body.primaryColor ?? DEFAULT_PRIMARY_COLOR,
			legalReference: body.legalReference ?? DEFAULT_LEGAL_REFERENCE,
			programName: body.programName,
			reference: body.reference,
			generatedAt: body.generatedAt ?? new Date().toISOString(),
			sections: body.sections,
			logoDataUrl,
			qrCodeDataUrl,
		});

		return new NextResponse(pdfBytes, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${safeReference}.pdf"`,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				message: "Failed to render preview PDF.",
				detail: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
