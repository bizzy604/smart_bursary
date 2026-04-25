"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login, type AuthUser, setAccessToken } from "@/lib/auth";
import { ApiClientError } from "@/lib/api-client";
import { API_ERROR_MESSAGES } from "@/lib/constants";
import { resolvePostLoginRoute } from "@/lib/role-routing";
import { useAuthStore } from "@/store/auth-store";

function isAuthRole(value: unknown): value is AuthUser["role"] {
	return (
		value === "STUDENT" ||
		value === "WARD_ADMIN" ||
		value === "FINANCE_OFFICER" ||
		value === "COUNTY_ADMIN" ||
		value === "PLATFORM_OPERATOR"
	);
}

function decodeJwtClaims(token: string): Record<string, unknown> | null {
	const parts = token.split(".");
	if (parts.length < 2) {
		return null;
	}

	try {
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
		const decoded = atob(padded);
		const payload = JSON.parse(decoded) as unknown;
		return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function nameFromEmail(email: string): string {
	const [localPart = "Portal User"] = email.split("@");
	return localPart.length > 0 ? localPart : "Portal User";
}

function userFromToken(accessToken: string): AuthUser | null {
	const claims = decodeJwtClaims(accessToken);
	if (!claims) {
		return null;
	}

	const id = typeof claims.sub === "string" ? claims.sub : null;
	const email = typeof claims.email === "string" ? claims.email : null;
	const role = isAuthRole(claims.role) ? claims.role : null;
	if (!id || !email || !role) {
		return null;
	}

	return {
		id,
		email,
		role,
		full_name: nameFromEmail(email),
		profile_complete: true,
	};
}

function resolveSessionUser(rawUser: unknown, accessToken: string): AuthUser | null {
	const tokenUser = userFromToken(accessToken);
	if (!rawUser || typeof rawUser !== "object") {
		return tokenUser;
	}

	const source = rawUser as Record<string, unknown>;
	const id = typeof source.id === "string" ? source.id : tokenUser?.id ?? null;
	const email = typeof source.email === "string" ? source.email : tokenUser?.email ?? null;
	const role = isAuthRole(source.role) ? source.role : tokenUser?.role ?? null;
	if (!id || !email || !role) {
		return tokenUser;
	}

	const fullName =
		typeof source.full_name === "string"
			? source.full_name
			: typeof source.fullName === "string"
				? source.fullName
				: tokenUser?.full_name ?? nameFromEmail(email);
	const profileComplete =
		typeof source.profile_complete === "boolean"
			? source.profile_complete
			: typeof source.profileComplete === "boolean"
				? source.profileComplete
				: tokenUser?.profile_complete ?? true;

	return {
		id,
		email,
		role,
		full_name: fullName,
		profile_complete: profileComplete,
	};
}

export default function LoginPage() {
	const router = useRouter();
	const setSession = useAuthStore((state) => state.setSession);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) {
			return;
		}

		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "");
		const countySlug = String(formData.get("county_slug") ?? "").trim().toLowerCase();

		if (!email || !password || !countySlug) {
			setErrorMessage("Enter your email, password, and county slug to continue.");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			const response = await login({ email, password, countySlug });
			const payload = response.data as Record<string, unknown>;
			const accessToken =
				typeof payload.accessToken === "string"
					? payload.accessToken
					: typeof payload.access_token === "string"
						? payload.access_token
						: null;
			if (!accessToken) {
				throw new Error("Login response did not include an access token.");
			}

			const user = resolveSessionUser(payload.user, accessToken);
			if (!user) {
				throw new Error("Unable to build a session user from login response.");
			}

			setAccessToken(accessToken);
			setSession({ accessToken, user });
			router.push(resolvePostLoginRoute(user.role));
			router.refresh();
		} catch (error: unknown) {
			if (error instanceof ApiClientError) {
				setErrorMessage(API_ERROR_MESSAGES[error.code] ?? error.message);
			} else {
				setErrorMessage("Unable to sign in right now. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Sign in to your portal</CardTitle>
				<CardDescription>
					Access your bursary applications, county notices, and decision updates.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form className="space-y-4" method="post" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium text-gray-700">
							Email address
						</label>
						<Input id="email" name="email" type="email" autoComplete="email" placeholder="aisha@example.com" required />
					</div>

					<div className="space-y-2">
						<label htmlFor="password" className="text-sm font-medium text-gray-700">
							Password
						</label>
						<Input
							id="password"
							name="password"
							type="password"
							autoComplete="current-password"
							placeholder="Enter your password"
							required
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="county" className="text-sm font-medium text-gray-700">
							County slug
						</label>
						<Input id="county" name="county_slug" placeholder="turkana" required />
					</div>

					<Button type="submit" fullWidth disabled={isSubmitting}>
						{isSubmitting ? "Signing in..." : "Sign in"}
					</Button>

					{errorMessage ? (
						<p role="alert" className="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
							{errorMessage}
						</p>
					) : null}
				</form>
			</CardContent>

			<CardFooter className="space-y-2 text-center text-sm text-gray-600">
				<Link href="/forgot-password" className="block text-brand-700 hover:underline">
					Forgot your password?
				</Link>
				<p>
					New to the portal?{" "}
					<Link href="/register" className="font-semibold text-brand-700 hover:underline">
						Create account
					</Link>
				</p>
			</CardFooter>
		</Card>
	);
}
