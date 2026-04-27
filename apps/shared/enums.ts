/**
 * Purpose: Shared enums for consistent data across frontend and backend
 * Why important: Ensures data consistency between client and server validation
 * Used by: Frontend forms and backend DTOs
 */

export const YEAR_OF_STUDY_VALUES = [
	'Year 1',
	'Year 2',
	'Year 3',
	'Year 4',
	'Year 5',
	'Year 6',
	'Final Year',
] as const;

export const GUARDIAN_RELATIONSHIP_VALUES = [
	'Father',
	'Mother',
	'Uncle',
	'Aunt',
	'Grandparent',
	'Brother',
	'Sister',
	'Relative',
	'Guardian',
	'Sponsor',
] as const;

export const FAMILY_STATUS_VALUES = [
	'BOTH_PARENTS_ALIVE',
	'SINGLE_PARENT',
	'ORPHAN',
	'PERSON_WITH_DISABILITY',
] as const;

export const INSTITUTION_TYPE_VALUES = [
	'University',
	'College',
	'Technical Institute',
	'TVET',
	'Polytechnic',
	'Other',
] as const;

export const GENDER_VALUES = [
	'Male',
	'Female',
] as const;

export type YearOfStudy = (typeof YEAR_OF_STUDY_VALUES)[number];
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIP_VALUES)[number];
export type FamilyStatus = (typeof FAMILY_STATUS_VALUES)[number];
export type InstitutionType = (typeof INSTITUTION_TYPE_VALUES)[number];
export type Gender = (typeof GENDER_VALUES)[number];
