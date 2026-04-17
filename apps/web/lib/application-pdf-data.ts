import type { PreviewSection } from "@/lib/application-preview";
import { countyBranding, getApplicationById, getProgramById, profileSnapshot } from "@/lib/student-data";

export function getPdfPayloadByApplicationId(applicationId: string) {
	const application = getApplicationById(applicationId);
	if (!application) {
		return null;
	}

	const program = getProgramById(application.programId);
const sections: PreviewSection[] = [
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

	return {
		application,
		pdfPayload: {
			countyName: countyBranding.name,
			fundName: countyBranding.fundName,
			programName: application.programName,
			reference: application.reference,
			generatedAt: application.updatedAt,
			sections,
		},
	};
}