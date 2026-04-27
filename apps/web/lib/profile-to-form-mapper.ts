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

/**
 * Maps student profile data to Section A form fields.
 * Only fills fields that have corresponding data in the profile.
 */
export function mapProfileToSectionA(profile: StudentProfileSnapshot): Partial<SectionAForm> {
  return {
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    institution: profile.institution,
    course: profile.course,
    yearOfStudy: profile.yearOfStudy,
  };
}

/**
 * Maps student profile data to Section C form fields.
 * Only fills fields that have corresponding data in the profile.
 */
export function mapProfileToSectionC(profile: StudentProfileSnapshot): Partial<SectionCForm> {
  return {
    familyStatus: profile.familyStatus,
    dependantsInSchool: profile.siblingsInSchool > 0 ? String(profile.siblingsInSchool) : "",
  };
}
