import { apiFetch } from "@/lib/api-client";
import { tokenStore } from "@/lib/token-store";

export interface AuthUser {
	id: string;
	email: string;
	role: "STUDENT" | "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN" | "PLATFORM_OPERATOR";
	full_name: string;
	profile_complete: boolean;
}

interface LoginResponse {
	accessToken?: string;
	access_token?: string;
	user?: {
		id?: string;
		email?: string;
		role?: AuthUser["role"];
		full_name?: string;
		fullName?: string;
		profile_complete?: boolean;
		profileComplete?: boolean;
	};
}

interface RegisterResponse {
	user_id: string;
	email: string;
	email_verification_sent: boolean;
	next_step: string;
}

// In-memory only — never persisted to localStorage or sessionStorage.
export function getAccessToken(): string | null {
	return tokenStore.get();
}

export function setAccessToken(token: string): void {
	tokenStore.set(token);
}

export function clearAccessToken(): void {
	tokenStore.clear();
}

export async function login(payload: {
	email: string;
	password: string;
	countySlug: string;
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
	countySlug: string;
	fullName: string;
}) {
	return apiFetch<RegisterResponse>("/auth/register", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function logout() {
	clearAccessToken();
	await apiFetch<null>("/auth/logout", {
		method: "POST",
	});
}
