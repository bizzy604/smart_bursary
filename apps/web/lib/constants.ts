export const APP_NAME = "KauntyBursary";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export const API_ERROR_MESSAGES: Record<string, string> = {
	VALIDATION_ERROR: "Please check the highlighted fields and try again.",
	DUPLICATE_APPLICATION: "You already have an application for this program.",
	PROGRAM_CLOSED: "This program is no longer accepting applications.",
	INELIGIBLE: "You are not eligible for this program at the moment.",
	BUDGET_EXHAUSTED: "This program budget is currently exhausted.",
	PROFILE_INCOMPLETE: "Complete your profile details before continuing.",
	TOKEN_EXPIRED: "Your session expired. Sign in again.",
	INSUFFICIENT_PERMISSIONS: "You do not have permission for this action.",
};

export const ROUTES = {
	login: "/login",
	register: "/register",
	verifyEmail: "/verify-email",
	verifyPhone: "/verify-phone",
	forgotPassword: "/forgot-password",
	resetPassword: "/reset-password",
	studentDashboard: "/dashboard",
} as const;

