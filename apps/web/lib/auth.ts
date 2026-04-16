import { apiFetch } from "@/lib/api-client";

const ACCESS_TOKEN_KEY = "smart-bursary.access-token";

export interface AuthUser {
	id: string;
	email: string;
	role: "STUDENT" | "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN" | "PLATFORM_OPERATOR";
	full_name: string;
	profile_complete: boolean;
}

interface LoginResponse {
	access_token: string;
	token_type: "Bearer";
	expires_in: number;
	user: AuthUser;
}

interface RegisterResponse {
	user_id: string;
	email: string;
	email_verification_sent: boolean;
	next_step: string;
}

export function getAccessToken(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function login(payload: {
	email: string;
	password: string;
	county_slug: string;
}) {
	return apiFetch<LoginResponse>("/auth/login", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function register(payload: {
	email: string;
	password: string;
	phone: string;
	county_slug: string;
	full_name: string;
}) {
	return apiFetch<RegisterResponse>("/auth/register", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function logout() {
	await apiFetch<null>("/auth/logout", {
		method: "POST",
	});
}

