import type { Route } from "next";
import {
	BadgeCheck,
	BarChart3,
	ClipboardList,
	FileSearch,
	LayoutDashboard,
	Settings,
	Users,
	Wallet,
	type LucideIcon,
} from "lucide-react";

import type { AuthUser } from "@/lib/auth";

export interface AdminNavigationItem {
	href: Route;
	label: string;
	icon: LucideIcon;
}

type AdminRole = Extract<AuthUser["role"], "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN">;

const wardNavigationItems: AdminNavigationItem[] = [
	{ href: "/ward/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/ward/applications", label: "Applications", icon: ClipboardList },
	{ href: "/ward/reports", label: "Reports", icon: BarChart3 },
];

const financeNavigationItems: AdminNavigationItem[] = [
	{ href: "/county/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/county/applications", label: "Applications", icon: ClipboardList },
	{ href: "/county/review", label: "Review Queue", icon: FileSearch },
	{ href: "/county/disbursements", label: "Disbursements", icon: Wallet },
	{ href: "/county/reports", label: "Reports", icon: BarChart3 },
];

const countyAdminNavigationItems: AdminNavigationItem[] = [
	{ href: "/county/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/county/programs" as Route, label: "Program Management", icon: BadgeCheck },
	{ href: "/county/applications", label: "Applications", icon: ClipboardList },
	{ href: "/county/review", label: "Review Queue", icon: FileSearch },
	{ href: "/county/disbursements", label: "Disbursements", icon: Wallet },
	{ href: "/county/reports", label: "Reports", icon: BarChart3 },
	{ href: "/settings/users" as Route, label: "Team", icon: Users },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export function getAdminNavigationItems(role: AdminRole): AdminNavigationItem[] {
	if (role === "WARD_ADMIN") {
		return wardNavigationItems;
	}

	if (role === "COUNTY_ADMIN") {
		return countyAdminNavigationItems;
	}

	return financeNavigationItems;
}
