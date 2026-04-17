import { NextResponse } from "next/server";
import { getPdfPayloadByApplicationId } from "@/lib/application-pdf-data";
import { renderApplicationPdf } from "@/lib/application-pdf";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = getPdfPayloadByApplicationId(id);

  if (!payload) {
    return NextResponse.json({ message: "Application not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const forceDownload = url.searchParams.get("download") === "true";

  const pdfBytes = await renderApplicationPdf(payload.pdfPayload);
  const filename = `${payload.application.reference.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename=\"${filename}\"`,
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return GET(request, context);
}