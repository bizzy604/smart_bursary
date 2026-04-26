/**
 * Purpose: Configure NextAuth (Auth.js v5) as the user-facing session layer.
 * Why important: Replaces the bespoke in-memory token store, JWT-decode-in-browser,
 *                and useEffect redirect chain with server-side sessions and middleware.
 * Used by: Next.js middleware, server components, route handlers, and the login page.
 */
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const ACCESS_TOKEN_SKEW_SECONDS = 30;

export type AppRole =
	| "STUDENT"
	| "WARD_ADMIN"
	| "FINANCE_OFFICER"
	| "COUNTY_ADMIN"
	| "VILLAGE_ADMIN"
	| "PLATFORM_OPERATOR";

declare module "next-auth" {
	interface Session {
		accessToken: string;
		accessTokenExpiresAt: number;
		error?: "RefreshFailed";
		user: {
			id: string;
			email: string;
			role: AppRole;
			countyId: string;
			wardId: string | null;
			fullName: string;
		} & DefaultSession["user"];
	}

	interface User {
		role?: AppRole;
		countyId?: string;
		wardId?: string | null;
		fullName?: string;
		accessToken?: string;
		accessTokenExpiresAt?: number;
		refreshToken?: string | null;
	}
}

type AppToken = {
	userId: string;
	email: string;
	role: AppRole;
	countyId: string;
	wardId: string | null;
	fullName: string;
	accessToken: string;
	accessTokenExpiresAt: number;
	refreshToken: string | null;
	error?: "RefreshFailed";
};

type NestAuthResponse = {
	accessToken: string;
	user?: {
		id?: string;
		email?: string;
		role?: AppRole;
		countyId?: string;
		county_id?: string;
		wardId?: string | null;
		ward_id?: string | null;
		fullName?: string;
		full_name?: string;
	};
};

type DecodedAccessToken = {
	sub: string;
	email: string;
	role: AppRole;
	countyId?: string;
	wardId?: string | null;
	exp: number;
};

function decodeAccessTokenClaims(token: string): DecodedAccessToken | null {
	const parts = token.split(".");
	if (parts.length < 2) {
		return null;
	}
	try {
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
		const decoded = Buffer.from(padded, "base64").toString("utf8");
		const claims = JSON.parse(decoded) as Partial<DecodedAccessToken>;
		if (
			typeof claims.sub !== "string" ||
			typeof claims.email !== "string" ||
			typeof claims.role !== "string" ||
			typeof claims.exp !== "number"
		) {
			return null;
		}
		return {
			sub: claims.sub,
			email: claims.email,
			role: claims.role as AppRole,
			countyId: typeof claims.countyId === "string" ? claims.countyId : undefined,
			wardId: typeof claims.wardId === "string" || claims.wardId === null ? claims.wardId : undefined,
			exp: claims.exp,
		};
	} catch {
		return null;
	}
}

function extractRefreshToken(setCookie: string | null): string | null {
	if (!setCookie) {
		return null;
	}
	for (const cookie of setCookie.split(/,(?=\s*[A-Za-z0-9_-]+=)/)) {
		const trimmed = cookie.trim();
		if (trimmed.startsWith("__refresh_token=")) {
			const valuePart = trimmed.split(";", 1)[0];
			const eqIndex = valuePart.indexOf("=");
			return eqIndex >= 0 ? valuePart.slice(eqIndex + 1) : null;
		}
	}
	return null;
}

function refreshTokenCookieHeader(refreshToken: string): string {
	return `__refresh_token=${refreshToken}`;
}

function nameFromEmail(email: string): string {
	const [localPart] = email.split("@");
	return localPart && localPart.length > 0 ? localPart : "Portal User";
}

function readString(token: Record<string, unknown>, key: string, fallback = ""): string {
	const v = token[key];
	return typeof v === "string" ? v : fallback;
}

function readNumber(token: Record<string, unknown>, key: string, fallback = 0): number {
	const v = token[key];
	return typeof v === "number" ? v : fallback;
}

function readWardId(token: Record<string, unknown>): string | null {
	const v = token.wardId;
	if (typeof v === "string") return v;
	return null;
}

async function refreshAccessToken(refreshToken: string): Promise<{
	accessToken: string;
	accessTokenExpiresAt: number;
	refreshToken: string;
} | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: refreshTokenCookieHeader(refreshToken),
			},
			cache: "no-store",
		});
		if (!response.ok) {
			return null;
		}
		const body = (await response.json()) as Record<string, unknown>;
		const raw = (body?.data ?? body) as Record<string, unknown>;
		const accessToken = typeof raw.accessToken === "string" ? raw.accessToken : null;
		if (!accessToken) {
			return null;
		}
		const claims = decodeAccessTokenClaims(accessToken);
		if (!claims) {
			return null;
		}
		const newRefreshToken = extractRefreshToken(response.headers.get("set-cookie")) ?? refreshToken;
		return {
			accessToken,
			accessTokenExpiresAt: claims.exp * 1000,
			refreshToken: newRefreshToken,
		};
	} catch {
		return null;
	}
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	session: { strategy: "jwt" },
	pages: {
		signIn: "/login",
	},
	providers: [
		Credentials({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
				countySlug: { label: "County slug", type: "text" },
			},
			async authorize(credentials) {
				const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
				const password = typeof credentials?.password === "string" ? credentials.password : "";
				const countySlug = typeof credentials?.countySlug === "string" ? credentials.countySlug.trim().toLowerCase() : "";

				if (!email || !password || !countySlug) {
					return null;
				}

				const response = await fetch(`${API_BASE_URL}/auth/login`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, password, countySlug }),
					cache: "no-store",
				});

				if (!response.ok) {
					return null;
				}

				const body = (await response.json()) as Record<string, unknown>;
				const raw = (body?.data ?? body) as NestAuthResponse;
				if (!raw.accessToken) {
					return null;
				}

				const claims = decodeAccessTokenClaims(raw.accessToken);
				if (!claims) {
					return null;
				}

				const refreshToken = extractRefreshToken(response.headers.get("set-cookie"));

				const id = raw.user?.id ?? claims.sub;
				const role = raw.user?.role ?? claims.role;
				const countyId = raw.user?.countyId ?? raw.user?.county_id ?? claims.countyId ?? "";
				const wardId =
					raw.user?.wardId !== undefined
						? raw.user.wardId
						: raw.user?.ward_id !== undefined
							? raw.user.ward_id
							: claims.wardId ?? null;
				const fullName =
					raw.user?.fullName ?? raw.user?.full_name ?? nameFromEmail(claims.email);

				return {
					id,
					email: claims.email,
					name: fullName,
					role,
					countyId,
					wardId,
					fullName,
					accessToken: raw.accessToken,
					accessTokenExpiresAt: claims.exp * 1000,
					refreshToken,
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, trigger }) {
			const tk = token as Record<string, unknown>;

			if (user) {
				tk.userId = (user as { id?: string }).id ?? "";
				tk.email = (user as { email?: string }).email ?? "";
				tk.role = (user as { role?: AppRole }).role ?? "STUDENT";
				tk.countyId = (user as { countyId?: string }).countyId ?? "";
				tk.wardId = (user as { wardId?: string | null }).wardId ?? null;
				tk.fullName = (user as { fullName?: string }).fullName ?? "";
				tk.accessToken = (user as { accessToken?: string }).accessToken ?? "";
				tk.accessTokenExpiresAt = (user as { accessTokenExpiresAt?: number }).accessTokenExpiresAt ?? 0;
				tk.refreshToken = (user as { refreshToken?: string | null }).refreshToken ?? null;
				delete tk.error;
				return token;
			}

			const now = Date.now();
			const expiresAt = readNumber(tk, "accessTokenExpiresAt");
			const isExpiring = expiresAt - now <= ACCESS_TOKEN_SKEW_SECONDS * 1000;

			if (!isExpiring && trigger !== "update") {
				return token;
			}

			const currentRefresh = typeof tk.refreshToken === "string" ? tk.refreshToken : null;
			if (!currentRefresh) {
				tk.error = "RefreshFailed";
				return token;
			}

			const refreshed = await refreshAccessToken(currentRefresh);
			if (!refreshed) {
				tk.error = "RefreshFailed";
				return token;
			}

			tk.accessToken = refreshed.accessToken;
			tk.accessTokenExpiresAt = refreshed.accessTokenExpiresAt;
			tk.refreshToken = refreshed.refreshToken;
			delete tk.error;
			return token;
		},
		async session({ session, token }) {
			const tk = token as Record<string, unknown>;
			session.accessToken = readString(tk, "accessToken");
			session.accessTokenExpiresAt = readNumber(tk, "accessTokenExpiresAt");
			const errorVal = tk.error;
			session.error = errorVal === "RefreshFailed" ? "RefreshFailed" : undefined;
			session.user = {
				...session.user,
				id: readString(tk, "userId"),
				email: readString(tk, "email"),
				role: (readString(tk, "role", "STUDENT") as AppRole),
				countyId: readString(tk, "countyId"),
				wardId: readWardId(tk),
				fullName: readString(tk, "fullName"),
				name: readString(tk, "fullName"),
			};
			return session;
		},
	},
});

export type { AppToken };
