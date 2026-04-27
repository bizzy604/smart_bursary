import QRCode from "qrcode";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
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
	logoUrl?: string;
};

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

	// Generate QR code
	const qrCodeDataUrl = await QRCode.toDataURL(
		`REF:${body.reference}`,
		{ width: 120, margin: 1, type: "image/png" },
	);

	// Fetch logo as data URL if provided
	let logoDataUrl: string | undefined;
	if (body.logoUrl) {
		try {
			const response = await fetch(body.logoUrl, { cache: "no-store" });
			if (response.ok) {
				const buffer = Buffer.from(await response.arrayBuffer());
				const contentType = response.headers.get("content-type") || "image/png";
				logoDataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
			}
		} catch {
			// Logo fetch failed, continue without it
		}
	}

	const html = buildApplicationPreviewHtml({
		countyName: body.countyName ?? DEFAULT_COUNTY_NAME,
		fundName: body.fundName ?? DEFAULT_FUND_NAME,
		programName: body.programName,
		reference: body.reference,
		generatedAt: body.generatedAt ?? new Date().toISOString(),
		sections: body.sections,
		logoDataUrl,
		qrCodeDataUrl,
	});

	const safeReference = body.reference.replace(/[^A-Za-z0-9_-]/g, "_");

	return new NextResponse(html, {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Content-Disposition": `inline; filename="${safeReference}.html"`,
			"X-PDF-Fallback": "true",
		},
	});
}