import { z } from "zod";

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

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

