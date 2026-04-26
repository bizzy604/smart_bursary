/**
 * Purpose: Lightweight client-side helpers that surface the NextAuth-managed
 *          access token to the legacy api-client without changing every fetch site.
 * Why important: The session is now owned by NextAuth (see `auth.ts`) and mirrored
 *                into `tokenStore` by `components/providers/session-provider.tsx`.
 *                These helpers preserve the existing import surface used by
 *                `lib/api-client.ts`, `lib/student-api.ts`, and `lib/ops-api.ts`.
 * Used by: api-client, student-api, ops-api, layout role-display helpers.
 */
import { tokenStore } from "@/lib/token-store";

export interface AuthUser {
	id: string;
	email: string;
	role:
		| "STUDENT"
		| "WARD_ADMIN"
		| "FINANCE_OFFICER"
		| "COUNTY_ADMIN"
		| "VILLAGE_ADMIN"
		| "PLATFORM_OPERATOR";
	full_name: string;
	profile_complete: boolean;
}

export function getAccessToken(): string | null {
	return tokenStore.get();
}

export function setAccessToken(token: string): void {
	tokenStore.set(token);
}

export function clearAccessToken(): void {
	tokenStore.clear();
}
