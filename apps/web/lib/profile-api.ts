/**
 * Purpose: Typed wrappers around the student profile read + section update
 *          endpoints exposed by `ProfileController` (apps/api/modules/profile).
 * Why important: The student-portal profile pages need to render editable forms
 *                that POST PATCH updates — this module gives those pages a
 *                stable, typed API surface without leaking `apiRequestJson`
 *                details into every page component.
 */
import { apiRequestJson } from "@/lib/api-client";

export interface ProfilePersonal {
	fullName: string | null;
	nationalId: string | null;
	dateOfBirth: string | null;
	gender: string | null;
	homeWard: string | null;
	villageUnit: string | null;
	phone: string | null;
	profileComplete?: boolean;
}

export interface ProfileAcademic {
	institutionType: string | null;
	institutionName: string | null;
	yearFormClass: string | null;
	admissionNumber: string | null;
	courseName: string | null;
	bankAccountName: string | null;
	bankAccountNumber: string | null;
	bankName: string | null;
	bankBranch: string | null;
}

export interface ProfileFamily {
	familyStatus: string | null;
	hasDisability: boolean | null;
	disabilityDetails: string | null;
	guardianName: string | null;
	guardianOccupation: string | null;
	guardianContact: string | null;
	numSiblings: number | null;
	numSiblingsInSchool: number | null;
	numGuardianChildren: number | null;
	fatherOccupation: string | null;
	fatherIncomeKes: number | null;
	motherOccupation: string | null;
	motherIncomeKes: number | null;
	guardianIncomeKes: number | null;
	orphanSponsorName: string | null;
	orphanSponsorRelation: string | null;
	orphanSponsorContact: string | null;
}

export interface RawProfile {
	personal: ProfilePersonal;
	academic: ProfileAcademic;
	family: ProfileFamily | null;
}

export interface UpdatePersonalPayload {
	fullName?: string;
	nationalId?: string;
	dateOfBirth?: string;
	gender?: string;
	homeWard?: string;
	villageUnit?: string;
	phone?: string;
}

export interface UpdateAcademicPayload {
	institutionType?: string;
	institutionName?: string;
	yearFormClass?: string;
	admissionNumber?: string;
	courseName?: string;
	bankAccountName?: string;
	bankAccountNumber?: string;
	bankName?: string;
	bankBranch?: string;
}

export interface UpdateFamilyPayload {
	familyStatus?: string;
	hasDisability?: boolean;
	disabilityDetails?: string;
	guardianName?: string;
	guardianOccupation?: string;
	guardianContact?: string;
	numSiblings?: number;
	numSiblingsInSchool?: number;
	numGuardianChildren?: number;
	fatherOccupation?: string;
	fatherIncomeKes?: number;
	motherOccupation?: string;
	motherIncomeKes?: number;
	guardianIncomeKes?: number;
	orphanSponsorName?: string;
	orphanSponsorRelation?: string;
	orphanSponsorContact?: string;
}

function unwrap<T>(payload: unknown): T {
	if (payload && typeof payload === "object" && "data" in (payload as object)) {
		return (payload as { data: T }).data;
	}
	return payload as T;
}

export async function fetchRawProfile(): Promise<RawProfile> {
	const response = await apiRequestJson<RawProfile>("/profile");
	return unwrap<RawProfile>(response);
}

export async function updatePersonalProfile(payload: UpdatePersonalPayload): Promise<RawProfile["personal"]> {
	const response = await apiRequestJson<RawProfile["personal"]>("/profile/personal", {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
	return unwrap(response);
}

export async function updateAcademicProfile(payload: UpdateAcademicPayload): Promise<RawProfile["academic"]> {
	const response = await apiRequestJson<RawProfile["academic"]>("/profile/academic", {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
	return unwrap(response);
}

export async function updateFamilyProfile(payload: UpdateFamilyPayload): Promise<RawProfile["family"]> {
	const response = await apiRequestJson<RawProfile["family"]>("/profile/family", {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
	return unwrap(response);
}
