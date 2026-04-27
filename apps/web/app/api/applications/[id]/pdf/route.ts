import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { canAccessPathForRole } from "@/lib/role-routing";
import { getPdfPayloadByApplicationId } from "@/lib/application-pdf-data";
import { buildApplicationPreviewHtml } from "@/lib/application-preview";
import { renderApplicationPdf } from "@/lib/application-pdf";

export const runtime = "nodejs";

async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
	const session = await auth();
	if (!session?.user) {
		return NextResponse.json({ message: "Authentication required" }, { status: 401 });
	}

	// Only roles that can legitimately view application detail pages may
	// download the PDF. Students see their own applications; ward / county /
	// finance reviewers see applications inside their county. Platform
	// operators do not have an application-detail view, so they are blocked
	// here as well.
	if (
		!canAccessPathForRole(session.user.role, "/applications") &&
		!canAccessPathForRole(session.user.role, "/county/applications") &&
		!canAccessPathForRole(session.user.role, "/ward")
	) {
		return NextResponse.json({ message: "Forbidden" }, { status: 403 });
	}

	const { id } = await context.params;
	const payload = await getPdfPayloadByApplicationId(id, session.accessToken);

	if (!payload) {
		return NextResponse.json({ message: "Application not found" }, { status: 404 });
	}

	const url = new URL(request.url);
	const forceDownload = url.searchParams.get("download") === "true";
	const filename = `${payload.application.reference.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;

	try {
		const pdfBytes = await renderApplicationPdf(payload.pdfPayload);

		return new NextResponse(pdfBytes, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename=\"${filename}\"`,
			},
		});
	} catch {
		// PDF rendering failed — return an HTML fallback for inline viewing.
		// Crucially we use `.html` (not `.pdf`) for the filename so that if a
		// browser does save it, the file extension matches the actual content
		// type. Callers asking for `application/pdf` should treat anything
		// other than that content type as a failure.
		const htmlFilename = `${payload.application.reference.replace(/[^A-Za-z0-9_-]/g, "_")}.html`;
		const html = buildApplicationPreviewHtml({
			countyName: payload.pdfPayload.countyName,
			fundName: payload.pdfPayload.fundName,
			programName: payload.pdfPayload.programName,
			reference: payload.pdfPayload.reference,
			generatedAt: payload.pdfPayload.generatedAt,
			sections: payload.pdfPayload.sections,
			logoDataUrl: payload.pdfPayload.logoDataUrl,
			qrCodeDataUrl: payload.pdfPayload.qrCodeDataUrl,
		});

		return new NextResponse(html, {
			status: 200,
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				"Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename=\"${htmlFilename}\"`,
				"X-PDF-Fallback": "true",
			},
		});
	}
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
	return handle(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
	return handle(request, context);
}
