import type { StudentProfileSnapshot } from "./student-types";

export interface SectionAForm {
  fullName: string;
  nationalIdOrBirthCert: string;
  phone: string;
  email: string;
  institution: string;
  admissionNumber: string;
  course: string;
  yearOfStudy: string;
  subCountyId: string;
  wardId: string;
  villageUnitId: string;
}

export interface SectionCForm {
  familyStatus: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianOccupation: string;
  householdSize: string;
  dependantsInSchool: string;
  siblings: unknown[];
}

// `fetchStudentProfile` returns the literal string "Not provided" for any
// profile field the user has not filled in yet (so the read-only profile pages
// have something to render). When prefilling the apply form we must drop those
// placeholder values so a) the inputs start empty and b) the section schema
// doesn't validate placeholder text as a real answer (which would either keep
// the Save & Next button disabled — for `yearOfStudy`, which must be one of an
// enum — or wrongly mark the section "complete" with placeholder data).
const PROFILE_PLACEHOLDER = "Not provided";
const YEAR_OF_STUDY_VALUES = new Set([
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Final Year",
]);

function realValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed === PROFILE_PLACEHOLDER) return undefined;
  return trimmed;
}

/**
 * Maps student profile data to Section A form fields.
 * Only fills fields that have corresponding real data in the profile;
 * unknown / placeholder values are omitted so the form receives an empty
 * string for those inputs.
 */
export function mapProfileToSectionA(profile: StudentProfileSnapshot): Partial<SectionAForm> {
  const result: Partial<SectionAForm> = {};

  const fullName = realValue(profile.fullName);
  if (fullName) result.fullName = fullName;

  const nationalId = realValue(profile.nationalId);
  if (nationalId) result.nationalIdOrBirthCert = nationalId;

  const phone = realValue(profile.phone);
  if (phone) result.phone = phone;

  const email = realValue(profile.email);
  if (email) result.email = email;

  const institution = realValue(profile.institution);
  if (institution) result.institution = institution;

  const admissionNumber = realValue(profile.admissionNumber);
  if (admissionNumber) result.admissionNumber = admissionNumber;

  const course = realValue(profile.course);
  if (course) result.course = course;

  // Section A renders `yearOfStudy` as a Select bound to a fixed enum. The
  // schema demands the value be one of those literals, so only prefill when
  // the profile value matches the enum exactly. Otherwise leave it blank.
  const yearOfStudy = realValue(profile.yearOfStudy);
  if (yearOfStudy && YEAR_OF_STUDY_VALUES.has(yearOfStudy)) {
    result.yearOfStudy = yearOfStudy;
  }

  return result;
}

/**
 * Maps student profile data to Section C form fields.
 * Only fills fields that have corresponding real data in the profile.
 */
export function mapProfileToSectionC(profile: StudentProfileSnapshot): Partial<SectionCForm> {
  const result: Partial<SectionCForm> = {};

  const familyStatus = realValue(profile.familyStatus);
  if (familyStatus) result.familyStatus = familyStatus;

  if (profile.siblingsInSchool > 0) {
    result.dependantsInSchool = String(profile.siblingsInSchool);
  }

  return result;
}
