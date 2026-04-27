import { z } from "zod";

const yearOfStudyValues = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Final Year"] as const;
const familyStatusValues = ["BOTH_PARENTS_ALIVE", "SINGLE_PARENT", "ORPHAN", "PERSON_WITH_DISABILITY"] as const;
const guardianRelationshipValues = [
	"Father",
	"Mother",
	"Uncle",
	"Aunt",
	"Grandparent",
	"Brother",
	"Sister",
	"Relative",
	"Guardian",
	"Sponsor",
] as const;
const occupationValues = [
	"Farmer",
	"Teacher",
	"Doctor",
	"Nurse",
	"Engineer",
	"Accountant",
	"Lawyer",
	"Business",
	"Trader",
	"Driver",
	"Security",
	"Domestic Worker",
	"Civil Servant",
	"Self-Employed",
	"Unemployed",
	"Retired",
	"Student",
	"Other",
] as const;
const sectionFDocumentTypes = ["id-copy", "school-fee-structure", "admission-letter", "result-slip", "guardian-id-copy"] as const;

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim().length === 0 ? undefined : value);
const requiredText = (field: string, maxLength: number) =>
	z.string().trim().min(1, `${field} is required`).max(maxLength, `${field} must not exceed ${maxLength} characters`);
const optionalText = (maxLength: number) =>
	z.preprocess(emptyToUndefined, z.string().trim().max(maxLength, `Must not exceed ${maxLength} characters`).optional());
const requiredInt = (min: number, field: string) =>
	z.coerce.number().int(`${field} must be a whole number`).min(min, `${field} must be at least ${min}`);
const optionalInt = z.preprocess(emptyToUndefined, z.coerce.number().int("Must be a whole number").min(0).optional());
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) => z.preprocess(emptyToUndefined, z.enum(values).optional());

const passwordRules = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.regex(/[A-Z]/, "Password must include an uppercase letter")
	.regex(/[a-z]/, "Password must include a lowercase letter")
	.regex(/[0-9]/, "Password must include a number")
	.regex(/[^a-zA-Z0-9]/, "Password must include a special character");

export const loginSchema = z.object({
	email: z.string().email("Enter a valid email address"),
	password: z.string().min(1, "Password is required"),
	countySlug: z.string().min(2, "County is required"),
});

export const registerSchema = z
	.object({
		fullName: z.string().min(2, "Full name is required"),
		email: z.string().email("Enter a valid email address"),
		phone: z.string().min(10, "Enter a valid phone number"),
		countySlug: z.string().min(2, "County is required"),
		password: passwordRules,
		confirmPassword: z.string().min(1, "Confirm your password"),
	})
	.refine((values) => values.password === values.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match",
	});

export const verifyEmailSchema = z.object({
	token: z.string().min(6, "Verification token is required"),
});

export const otpSchema = z.object({
	otp: z
		.string()
		.length(6, "OTP must be 6 digits")
		.regex(/^[0-9]{6}$/, "OTP must contain digits only"),
});

export const forgotPasswordSchema = z.object({
	email: z.string().email("Enter a valid email address"),
	countySlug: z.string().min(2, "County is required"),
});

export const resetPasswordSchema = z
	.object({
		token: z.string().min(6, "Reset token is required"),
		newPassword: passwordRules,
		confirmPassword: z.string().min(1, "Confirm your password"),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match",
	});

export const applicationSectionASchema = z.object({
	fullName: requiredText("Full name", 255),
	nationalIdOrBirthCert: requiredText("National ID or birth certificate number", 40),
	phone: requiredText("Phone number", 20),
	email: z.string().trim().email("Enter a valid email address").max(255, "Email must not exceed 255 characters"),
	institution: requiredText("Institution", 255),
	admissionNumber: requiredText("Admission number", 80),
	course: requiredText("Course or class", 120),
	yearOfStudy: z.enum(yearOfStudyValues),
	subCountyId: optionalText(255),
	wardId: optionalText(255),
	villageUnitId: optionalText(255),
});

export const applicationSectionBSchema = z
	.object({
		requestedKes: requiredInt(1, "Requested amount"),
		feeBalanceKes: requiredInt(0, "Fee balance"),
		totalFeeKes: requiredInt(0, "Total annual fee"),
		sponsorSupportKes: optionalInt,
		helbApplied: z.boolean(),
		helbAmountKes: optionalInt,
		priorBursaryReceived: z.boolean(),
		priorBursarySource: optionalText(255),
		priorBursaryAmountKes: optionalInt,
		reasonForSupport: requiredText("Reason for support", 2000).min(20, "Reason for support must be at least 20 characters"),
	})
	.superRefine((value, ctx) => {
		if (value.helbApplied && value.helbAmountKes === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["helbAmountKes"],
				message: "HELB amount is required when HELB support is selected",
			});
		}

		if (value.priorBursaryReceived && !value.priorBursarySource) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["priorBursarySource"],
				message: "Prior bursary source is required",
			});
		}

		if (value.priorBursaryReceived && value.priorBursaryAmountKes === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["priorBursaryAmountKes"],
				message: "Prior bursary amount is required",
			});
		}
	});

const siblingSchema = z.object({
	name: requiredText("Sibling name", 255),
	institution: requiredText("Sibling institution", 255),
	level: requiredText("Sibling education level", 80),
	annualFeeKes: optionalInt,
	feePaidKes: optionalInt,
});

export const applicationSectionCSchema = z.object({
	familyStatus: z.enum(familyStatusValues),
	guardianName: requiredText("Guardian name", 255),
	guardianRelationship: z.enum(guardianRelationshipValues),
	guardianPhone: requiredText("Guardian phone", 20),
	guardianOccupation: optionalText(120),
	householdSize: requiredInt(1, "Household size"),
	dependantsInSchool: optionalInt,
	siblings: z.preprocess(
		(value) =>
			Array.isArray(value)
				? value.filter((item) => {
						if (!item || typeof item !== "object") {
							return false;
						}

						const row = item as Record<string, unknown>;
						return (
							typeof row.name === "string" &&
							row.name.trim().length > 0 &&
							typeof row.institution === "string" &&
							row.institution.trim().length > 0 &&
							typeof row.level === "string" &&
							row.level.trim().length > 0
						);
					})
				: value,
		z.array(siblingSchema).optional(),
	),
});

const sectionDIncomeSchema = z.object({
	fatherOccupation: optionalEnum(occupationValues),
	fatherMonthlyIncomeKes: optionalInt,
	motherOccupation: optionalEnum(occupationValues),
	motherMonthlyIncomeKes: optionalInt,
	guardianOccupation: optionalEnum(occupationValues),
	guardianMonthlyIncomeKes: optionalInt,
	additionalIncomeSource: optionalText(200),
	additionalIncomeKes: optionalInt,
});

export const applicationSectionDSchema = z.object({
	income: sectionDIncomeSchema,
	rentOrBoardingKes: optionalInt,
	medicalSupportKes: optionalInt,
	supportFromWellWishersKes: optionalInt,
	hardshipNarrative: requiredText("Financial hardship narrative", 3000).min(
		30,
		"Financial hardship narrative must be at least 30 characters",
	),
});

export const applicationSectionESchema = z
	.object({
		hasOtherBursary: z.boolean(),
		otherBursaryDetails: optionalText(1000),
		hasDisabilityNeeds: z.boolean(),
		disabilityDetails: optionalText(1000),
		declarationName: requiredText("Declaration full name", 255),
		confirmTruth: z.literal(true, { errorMap: () => ({ message: "Confirm that the information is true" }) }),
		authorizeVerification: z.literal(true, { errorMap: () => ({ message: "Authorize verification to continue" }) }),
		acceptPrivacyPolicy: z.literal(true, { errorMap: () => ({ message: "Accept privacy terms to continue" }) }),
	})
	.superRefine((value, ctx) => {
		if (value.hasOtherBursary && !value.otherBursaryDetails) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["otherBursaryDetails"],
				message: "Other bursary details are required",
			});
		}

		if (value.hasDisabilityNeeds && !value.disabilityDetails) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["disabilityDetails"],
				message: "Disability details are required",
			});
		}
	});

const sectionFDocumentSchema = z.object({
	type: z.enum(sectionFDocumentTypes),
	label: requiredText("Document label", 120),
	fileName: requiredText("Document file name", 255),
});

export const applicationSectionFSchema = z.object({
	documents: z.array(sectionFDocumentSchema).min(1, "Upload at least one supporting document"),
	additionalNotes: optionalText(1000),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ApplicationSectionAValues = z.infer<typeof applicationSectionASchema>;
export type ApplicationSectionBValues = z.infer<typeof applicationSectionBSchema>;
export type ApplicationSectionCValues = z.infer<typeof applicationSectionCSchema>;
export type ApplicationSectionDValues = z.infer<typeof applicationSectionDSchema>;
export type ApplicationSectionEValues = z.infer<typeof applicationSectionESchema>;
export type ApplicationSectionFValues = z.infer<typeof applicationSectionFSchema>;

