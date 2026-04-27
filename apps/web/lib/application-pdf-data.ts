/**
 * Purpose: Build the PDF payload for an application by fetching real data from the backend API.
 * Why important: Replaces the previous mock-data implementation so generated PDFs reflect the
 *                actual application, applicant profile, program, and persisted section data
 *                rather than hard-coded fixtures. Branding falls back to safe defaults when the
 *                caller's role is not authorised to read tenant settings (e.g., students).
 * Used by: app/(student)/applications/[id]/pdf/route.ts and app/api/applications/[id]/pdf/route.ts.
 */
import QRCode from "qrcode";
import type { PreviewSection } from "@/lib/application-preview";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const DEFAULT_BRANDING = {
	countyName: "County Bursary Fund",
	fundName: "County Bursary Fund",
	primaryColor: "#1E3A5F",
	legalReference: "",
} as const;

export type PdfPayload = {
	countyName: string;
	fundName: string;
	primaryColor: string;
	legalReference: string;
	programName: string;
	reference: string;
	generatedAt: string;
	sections: PreviewSection[];
	logoDataUrl?: string;
	qrCodeDataUrl?: string;
};

export type PdfPayloadResult = {
	application: {
		id: string;
		reference: string;
		status: string;
		submittedAt: string | null;
		updatedAt: string;
	};
	pdfPayload: PdfPayload;
};

type ApplicationDetailRow = {
	id: string;
	status?: string;
	programId?: string;
	totalFeeKes?: unknown;
	outstandingBalance?: unknown;
	amountAbleToPay?: unknown;
	amountRequested?: unknown;
	amountAllocated?: unknown;
	helbApplied?: boolean | null;
	priorBursaryReceived?: boolean | null;
	priorBursarySource?: string | null;
	priorBursaryAmount?: unknown;
	reason?: string | null;
	submissionReference?: string | null;
	submittedAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
	sections?: Array<{ sectionKey: string; data: unknown; isComplete: boolean; savedAt?: string }>;
	program?: { id: string; name?: string };
};

type ProfileResponse = {
	personal?: {
		fullName?: string | null;
		nationalId?: string | null;
		dateOfBirth?: string | null;
		gender?: string | null;
		homeWard?: string | null;
		villageUnit?: string | null;
		phone?: string | null;
	};
	academic?: {
		institutionType?: string | null;
		institutionName?: string | null;
		yearFormClass?: string | null;
		admissionNumber?: string | null;
		courseName?: string | null;
		bankName?: string | null;
		bankBranch?: string | null;
	};
	family?: {
		familyStatus?: string | null;
		guardianName?: string | null;
		guardianContact?: string | null;
		numSiblingsInSchool?: number | null;
		fatherIncomeKes?: number | null;
		motherIncomeKes?: number | null;
		guardianIncomeKes?: number | null;
	} | null;
};

type ProgramDetailRow = {
	id: string;
	name?: string;
	description?: string | null;
	wardId?: string | null;
	academicYear?: string | null;
	closesAt?: string;
	opensAt?: string;
	budgetCeiling?: unknown;
};

type BrandingResponse = {
	countyName?: string;
	fundName?: string;
	primaryColor?: string;
	legalReference?: string;
	logoUrl?: string;
};

function unwrap<T>(payload: unknown): T {
	if (payload && typeof payload === "object" && "data" in (payload as object)) {
		return (payload as { data: T }).data;
	}
	return payload as T;
}

async function fetchJson<T>(
	path: string,
	accessToken: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	});
	if (!response.ok) {
		return { ok: false, status: response.status };
	}
	const body = await response.json().catch(() => null);
	return { ok: true, data: unwrap<T>(body) };
}

function asText(value: unknown, fallback = "—"): string {
	if (typeof value === "string" && value.trim().length > 0) return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return fallback;
}

function asAmountKes(value: unknown): string {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value.toLocaleString();
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed.toLocaleString();
		return value;
	}
	return "—";
}

function findSection(
	application: ApplicationDetailRow,
	key: string,
): Record<string, unknown> | null {
	const row = application.sections?.find((entry) => entry.sectionKey === key);
	if (!row || !row.data || typeof row.data !== "object") return null;
	return row.data as Record<string, unknown>;
}

function buildPersonalSection(
	profile: ProfileResponse | null,
	application: ApplicationDetailRow,
): PreviewSection {
	const personal = profile?.personal ?? {};
	const academic = profile?.academic ?? {};
	const sectionA = findSection(application, "section-a");

	return {
		slug: "section-a",
		title: "A. Student Personal Details",
		entries: [
			{ label: "Full Name", value: asText(personal.fullName ?? sectionA?.fullName) },
			{ label: "National ID / Birth Cert", value: asText(personal.nationalId ?? sectionA?.nationalId) },
			{ label: "Date of Birth", value: asText(personal.dateOfBirth ?? sectionA?.dateOfBirth) },
			{ label: "Gender", value: asText(personal.gender ?? sectionA?.gender) },
			{ label: "Phone", value: asText(personal.phone ?? sectionA?.phone) },
			{ label: "Home Ward", value: asText(personal.homeWard ?? sectionA?.homeWard) },
			{ label: "Village Unit", value: asText(personal.villageUnit ?? sectionA?.villageUnit) },
			{ label: "Institution", value: asText(academic.institutionName ?? sectionA?.institutionName) },
			{ label: "Course", value: asText(academic.courseName ?? sectionA?.courseName) },
			{ label: "Year / Form / Class", value: asText(academic.yearFormClass ?? sectionA?.yearFormClass) },
			{ label: "Admission Number", value: asText(academic.admissionNumber ?? sectionA?.admissionNumber) },
		],
	};
}

function buildAmountsSection(application: ApplicationDetailRow): PreviewSection {
	const sectionB = findSection(application, "section-b");
	return {
		slug: "section-b",
		title: "B. Application Request & Amounts",
		entries: [
			{ label: "Program", value: asText(application.program?.name) },
			{ label: "Total Fee (KES)", value: asAmountKes(application.totalFeeKes ?? sectionB?.totalFeeKes) },
			{ label: "Outstanding Balance (KES)", value: asAmountKes(application.outstandingBalance ?? sectionB?.outstandingBalance) },
			{ label: "Amount Able To Pay (KES)", value: asAmountKes(application.amountAbleToPay ?? sectionB?.amountAbleToPay) },
			{ label: "Amount Requested (KES)", value: asAmountKes(application.amountRequested ?? sectionB?.amountRequested) },
			{ label: "HELB Applied", value: asText(application.helbApplied ?? sectionB?.helbApplied) },
			{ label: "Prior Bursary Received", value: asText(application.priorBursaryReceived ?? sectionB?.priorBursaryReceived) },
			{ label: "Prior Bursary Source", value: asText(application.priorBursarySource ?? sectionB?.priorBursarySource) },
			{ label: "Status", value: asText(application.status) },
		],
	};
}

function buildFamilySection(profile: ProfileResponse | null, application: ApplicationDetailRow): PreviewSection {
	const family = profile?.family ?? {};
	const sectionC = findSection(application, "section-c");
	const sectionD = findSection(application, "section-d");
	return {
		slug: "section-c",
		title: "C/D. Family & Financial Status",
		entries: [
			{ label: "Family Status", value: asText(family.familyStatus ?? sectionC?.familyStatus) },
			{ label: "Guardian Name", value: asText(family.guardianName ?? sectionC?.guardianName) },
			{ label: "Guardian Contact", value: asText(family.guardianContact ?? sectionC?.guardianContact) },
			{ label: "Siblings in School", value: asText(family.numSiblingsInSchool ?? sectionC?.numSiblingsInSchool) },
			{ label: "Father Income (KES/year)", value: asAmountKes(family.fatherIncomeKes ?? sectionD?.fatherIncomeKes) },
			{ label: "Mother Income (KES/year)", value: asAmountKes(family.motherIncomeKes ?? sectionD?.motherIncomeKes) },
			{ label: "Guardian Income (KES/year)", value: asAmountKes(family.guardianIncomeKes ?? sectionD?.guardianIncomeKes) },
		],
	};
}

function buildSubmissionSection(application: ApplicationDetailRow): PreviewSection {
	return {
		slug: "section-f",
		title: "F. Submission Information",
		entries: [
			{ label: "Reference", value: asText(application.submissionReference ?? application.id) },
			{ label: "Reason for Application", value: asText(application.reason) },
			{ label: "Submitted At", value: asText(application.submittedAt) },
			{ label: "Last Updated", value: asText(application.updatedAt) },
		],
	};
}

/**
 * Fetch the application + applicant profile + program + tenant branding from the backend
 * and build the PDF payload. Returns null when the application is not found or the caller
 * is not authorised to read it. Branding is best-effort: if /tenant/branding returns 403
 * (e.g., student caller), safe defaults are used.
 */
export async function getPdfPayloadByApplicationId(
	applicationId: string,
	accessToken: string,
): Promise<PdfPayloadResult | null> {
	const appResult = await fetchJson<ApplicationDetailRow>(
		`/applications/${applicationId}`,
		accessToken,
	);
	if (!appResult.ok) {
		// 404 → no such application; 403 → caller not authorised. Either way, no PDF.
		return null;
	}
	const application = appResult.data;

	const [profileResult, programResult, brandingResult] = await Promise.all([
		fetchJson<ProfileResponse>("/profile", accessToken),
		application.programId
			? fetchJson<ProgramDetailRow>(`/programs/${application.programId}`, accessToken)
			: Promise.resolve({ ok: false as const, status: 404 }),
		fetchJson<BrandingResponse>("/tenant/branding", accessToken),
	]);

	const profile: ProfileResponse | null = profileResult.ok ? profileResult.data : null;
	const program: ProgramDetailRow | null = programResult.ok ? programResult.data : null;
	const branding: BrandingResponse =
		brandingResult.ok ? brandingResult.data : { ...DEFAULT_BRANDING };

	const sections: PreviewSection[] = [
		buildPersonalSection(profile, application),
		buildAmountsSection({ ...application, program: program ?? application.program }),
		buildFamilySection(profile, application),
		buildSubmissionSection(application),
	];

	const logoDataUrl = branding.logoUrl
		? await fetchLogoAsDataUrl(branding.logoUrl)
		: undefined;
	const qrCodeDataUrl = await QRCode.toDataURL(
		`REF:${application.submissionReference ?? application.id}`,
		{ width: 120, margin: 1, type: "image/png" },
	);

	return {
		application: {
			id: application.id,
			reference: application.submissionReference ?? application.id,
			status: application.status ?? "DRAFT",
			submittedAt: application.submittedAt ?? null,
			updatedAt: application.updatedAt ?? new Date().toISOString(),
		},
		pdfPayload: {
			countyName: branding.countyName ?? DEFAULT_BRANDING.countyName,
			fundName: branding.fundName ?? DEFAULT_BRANDING.fundName,
			primaryColor: branding.primaryColor ?? DEFAULT_BRANDING.primaryColor,
			legalReference: branding.legalReference ?? DEFAULT_BRANDING.legalReference,
			programName: program?.name ?? application.program?.name ?? "Bursary Program",
			reference: application.submissionReference ?? application.id,
			generatedAt: application.updatedAt ?? new Date().toISOString(),
			sections,
			logoDataUrl,
			qrCodeDataUrl,
		},
	};
}

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