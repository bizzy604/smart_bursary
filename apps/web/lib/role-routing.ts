import type { Route } from "next";

export type AppRole =
	| "STUDENT"
	| "WARD_ADMIN"
	| "FINANCE_OFFICER"
	| "COUNTY_ADMIN"
	| "VILLAGE_ADMIN"
	| "PLATFORM_OPERATOR";

type RoleAccessPolicy = {
	home: Route;
	allowedPrefixes: readonly string[];
};

const ROLE_ACCESS_POLICY: Record<AppRole, RoleAccessPolicy> = {
	STUDENT: {
		home: "/dashboard",
		allowedPrefixes: ["/dashboard", "/programs", "/apply", "/applications", "/profile"],
	},
	WARD_ADMIN: {
		home: "/ward/dashboard",
		allowedPrefixes: ["/ward"],
	},
	FINANCE_OFFICER: {
		home: "/county/dashboard",
		allowedPrefixes: ["/county"],
	},
	COUNTY_ADMIN: {
		home: "/county/dashboard",
		allowedPrefixes: [
			"/county/dashboard",
			"/county/programs",
			"/county/applications",
			"/county/review",
			"/county/disbursements",
			"/county/reports",
			"/county/locations",
			"/settings",
		],
	},
	VILLAGE_ADMIN: {
		home: "/village/dashboard" as Route,
		allowedPrefixes: ["/village"],
	},
	PLATFORM_OPERATOR: {
		home: "/tenants",
		allowedPrefixes: ["/tenants", "/health"],
	},
};

function matchesPrefix(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolvePostLoginRoute(role: AppRole): Route {
	return ROLE_ACCESS_POLICY[role].home;
}

export function canAccessPathForRole(role: AppRole, pathname: string): boolean {
	return ROLE_ACCESS_POLICY[role].allowedPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}
