/**
 * Purpose: Enforce session presence and role-based path access at the edge.
 * Why important: Replaces client-side useEffect redirects so protected pages never render unauthenticated content.
 * Used by: Every request that matches the configured matcher.
 */
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { canAccessPathForRole, resolvePostLoginRoute, type AppRole } from "@/lib/role-routing";

const PUBLIC_PREFIXES = [
	"/login",
	"/register",
	"/forgot-password",
	"/reset-password",
	"/verify-email",
	"/verify-phone",
];

const AUTH_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

function isPublicPath(pathname: string): boolean {
	if (pathname === "/") {
		return true;
	}
	return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthPath(pathname: string): boolean {
	return AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default auth((request) => {
	const { nextUrl } = request;
	const pathname = nextUrl.pathname;
	const session = request.auth;

	if (session?.error === "RefreshFailed") {
		const loginUrl = new URL("/login", nextUrl);
		loginUrl.searchParams.set("reason", "expired");
		const response = NextResponse.redirect(loginUrl);
		response.cookies.delete("authjs.session-token");
		response.cookies.delete("__Secure-authjs.session-token");
		return response;
	}

	if (session?.user && isAuthPath(pathname)) {
		return NextResponse.redirect(new URL(resolvePostLoginRoute(session.user.role as AppRole), nextUrl));
	}

	if (isPublicPath(pathname)) {
		// "/" is public so unauthenticated users can hit the marketing/redirect
		// shell, but authenticated users should jump straight to their role home
		// instead of going / -> /login -> home.
		if (pathname === "/" && session?.user) {
			return NextResponse.redirect(
				new URL(resolvePostLoginRoute(session.user.role as AppRole), nextUrl),
			);
		}
		return NextResponse.next();
	}

	if (!session?.user) {
		const loginUrl = new URL("/login", nextUrl);
		if (pathname && pathname !== "/login") {
			loginUrl.searchParams.set("from", pathname);
		}
		return NextResponse.redirect(loginUrl);
	}

	if (!canAccessPathForRole(session.user.role as AppRole, pathname)) {
		return NextResponse.redirect(new URL(resolvePostLoginRoute(session.user.role as AppRole), nextUrl));
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		// Run on all page paths except Next.js internals, the entire /api/* surface,
		// and asset extensions. /api routes are excluded because each route handler
		// performs its own session check via auth() — the middleware's role-policy
		// in lib/role-routing has no /api prefix, so leaving them in the matcher
		// would (incorrectly) redirect authenticated users away from API endpoints
		// like /api/applications/[id]/pdf.
		"/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[^/]+$).*)",
	],
};
