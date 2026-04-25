import type { Route } from "next";
import { FileText, GraduationCap, LayoutDashboard, UserRound, type LucideIcon } from "lucide-react";

export interface StudentNavigationItem {
	href: Route;
	label: string;
	icon: LucideIcon;
}

export const studentNavigationItems: StudentNavigationItem[] = [
	{ href: "/dashboard", label: "Home", icon: LayoutDashboard },
	{ href: "/programs", label: "Programs", icon: GraduationCap },
	{ href: "/applications", label: "Applications", icon: FileText },
	{ href: "/profile", label: "Profile", icon: UserRound },
];
