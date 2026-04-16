import { NextResponse } from "next/server";
import { buildApplicationPreviewHtml, type PreviewSection } from "@/lib/application-preview";
import { countyBranding, getApplicationById, getProgramById, profileSnapshot } from "@/lib/student-data";

function buildPrintableSections(applicationId: string): PreviewSection[] {
  const application = getApplicationById(applicationId);
  const program = application ? getProgramById(application.programId) : null;

  if (!application) {
    return [];
  }

  return [
    {
      slug: "section-a",
      title: "A. Student Personal Details",
      entries: [
        { label: "Full Name", value: profileSnapshot.fullName },
        { label: "Email", value: profileSnapshot.email },
        { label: "Phone", value: profileSnapshot.phone },
        { label: "Institution", value: profileSnapshot.institution },
        { label: "Course", value: profileSnapshot.course },
      ],
    },
    {
      slug: "section-b",
      title: "B. Application Request",
      entries: [
        { label: "Program", value: application.programName },
        { label: "Ward Scope", value: program?.ward ?? "County-wide" },
        { label: "Requested Amount (KES)", value: String(application.requestedKes) },
        { label: "Status", value: application.status },
      ],
    },
    {
      slug: "section-f",
      title: "F. Submission Information",
      entries: [
        { label: "Reference", value: application.reference },
        { label: "Submitted At", value: application.submittedAt },
        { label: "Last Updated", value: application.updatedAt },
      ],
    },
  ];
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const application = getApplicationById(id);

  if (!application) {
    return NextResponse.json({ message: "Application not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const forceDownload = url.searchParams.get("download") === "true";

  const html = buildApplicationPreviewHtml({
    countyName: countyBranding.name,
    fundName: countyBranding.fundName,
    programName: application.programName,
    reference: application.reference,
    generatedAt: application.updatedAt,
    sections: buildPrintableSections(id),
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(forceDownload ? { "Content-Disposition": `attachment; filename=\"${application.reference}.html\"` } : {}),
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return GET(request, context);
}