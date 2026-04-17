import { API_BASE_URL } from "@/lib/constants";

const ACCESS_TOKEN_KEY = "smart-bursary.access-token";

export const FORM_SECTION_ORDER = ["section-a", "section-b", "section-c", "section-d", "section-e", "section-f"] as const;

export const SECTION_LABELS: Record<(typeof FORM_SECTION_ORDER)[number], string> = {
	"section-a": "A. Personal Details",
	"section-b": "B. Amounts Applied",
	"section-c": "C. Family Details",
	"section-d": "D. Financial Status",
	"section-e": "E. Other Disclosures",
	"section-f": "F. Supporting Documents",
};

export type SectionKey = (typeof FORM_SECTION_ORDER)[number];

export interface BrandingSettings {
	countyName: string;
	fundName: string;
	legalReference: string;
	primaryColor: string;
	logoText: string;
	logoS3Key: string;
}

export interface FormCustomizationSettings {
	colorScheme: "COUNTY_PRIMARY" | "NEUTRAL";
	logoPlacement: "HEADER_LEFT" | "HEADER_CENTER" | "HEADER_RIGHT";
	sectionOrder: SectionKey[];
}

export interface ScoringWeights {
	family_status: number;
	family_income: number;
	education_burden: number;
	academic_standing: number;
	document_quality: number;
	integrity: number;
}

export interface AdminSettings {
	countyId: string;
	branding: BrandingSettings;
	formCustomization: FormCustomizationSettings;
	scoringWeights: ScoringWeights;
	updatedAt: string;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
	family_status: 0.25,
	family_income: 0.25,
	education_burden: 0.2,
	academic_standing: 0.1,
	document_quality: 0.1,
	integrity: 0.1,
};

function resolveApiUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE_URL}${normalized}`;
}

function getAccessToken(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function resolveErrorMessage(payload: unknown): string {
	if (payload && typeof payload === "object") {
		const source = payload as Record<string, unknown>;
		if (typeof source.message === "string" && source.message.length > 0) {
			return source.message;
		}
		if (source.error && typeof source.error === "object") {
			const errorObject = source.error as Record<string, unknown>;
			if (typeof errorObject.message === "string" && errorObject.message.length > 0) {
				return errorObject.message;
			}
		}
	}

	return "Request failed. Please try again.";
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
	const token = getAccessToken();
	const headers: Record<string, string> = {
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...(init.body ? { "Content-Type": "application/json" } : {}),
	};

	const response = await fetch(resolveApiUrl(path), {
		...init,
		headers: {
			...headers,
			...(init.headers ?? {}),
		},
		credentials: "include",
		cache: "no-store",
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as unknown;
		throw new Error(resolveErrorMessage(payload));
	}

	return (await response.json()) as T;
}

function asSectionOrder(value: unknown): SectionKey[] {
	if (!Array.isArray(value)) {
		return [...FORM_SECTION_ORDER];
	}

	const entries = value.filter((item): item is SectionKey => FORM_SECTION_ORDER.includes(item as SectionKey));
	if (entries.length !== FORM_SECTION_ORDER.length) {
		return [...FORM_SECTION_ORDER];
	}

	return [...entries];
}

export async function fetchAdminSettings(): Promise<AdminSettings> {
	const payload = await requestJson<{ data: AdminSettings }>("/admin/settings", { method: "GET" });
	return payload.data;
}

export async function updateAdminSettings(payload: {
	branding?: Partial<BrandingSettings>;
	formCustomization?: Partial<FormCustomizationSettings>;
}): Promise<AdminSettings> {
	const response = await requestJson<{ data: AdminSettings }>("/admin/settings", {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
	return {
		...response.data,
		formCustomization: {
			...response.data.formCustomization,
			sectionOrder: asSectionOrder(response.data.formCustomization.sectionOrder),
		},
	};
}

export async function fetchScoringWeights(): Promise<{ weights: ScoringWeights; scoringWeightsUpdatedAt: string | null }> {
	const payload = await requestJson<{ data: { weights: ScoringWeights; scoringWeightsUpdatedAt: string | null } }>(
		"/admin/scoring-weights",
		{ method: "GET" },
	);
	return {
		weights: payload.data.weights ?? { ...DEFAULT_SCORING_WEIGHTS },
		scoringWeightsUpdatedAt: payload.data.scoringWeightsUpdatedAt ?? null,
	};
}

export async function updateScoringWeights(weights: ScoringWeights): Promise<{ weights: ScoringWeights; scoringWeightsUpdatedAt: string | null }> {
	const payload = await requestJson<{ data: { weights: ScoringWeights; scoringWeightsUpdatedAt: string | null } }>(
		"/admin/scoring-weights",
		{
			method: "PATCH",
			body: JSON.stringify(weights),
		},
	);
	return {
		weights: payload.data.weights,
		scoringWeightsUpdatedAt: payload.data.scoringWeightsUpdatedAt,
	};
}
