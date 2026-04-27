import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getPdfPayloadByApplicationId } from "@/lib/application-pdf-data";
import { buildApplicationPreviewHtml } from "@/lib/application-preview";
import { renderApplicationPdf } from "@/lib/application-pdf";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
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
        "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename=\"${filename}\"`,
        "X-PDF-Fallback": "true",
      },
    });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return GET(request, context);
}