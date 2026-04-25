import type { Route } from "next";
import type { AuthUser } from "@/lib/auth";

export interface AdminNavigationItem {
  href: Route;
  label: string;
}

type AdminRole = Extract<AuthUser["role"], "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN">;

const wardNavigationItems: AdminNavigationItem[] = [
  { href: "/ward/dashboard", label: "Dashboard" },
  { href: "/ward/applications", label: "Applications" },
  { href: "/ward/reports", label: "Reports" },
];

const financeNavigationItems: AdminNavigationItem[] = [
  { href: "/county/dashboard", label: "Dashboard" },
  { href: "/county/applications", label: "Applications" },
  { href: "/county/review", label: "Review Queue" },
  { href: "/county/disbursements", label: "Disbursements" },
  { href: "/county/reports", label: "Reports" },
];

const countyAdminNavigationItems: AdminNavigationItem[] = [
  { href: "/county/dashboard", label: "Dashboard" },
  { href: "/county/programs" as Route, label: "Program Management" },
  { href: "/county/applications", label: "Applications" },
  { href: "/county/review", label: "Review Queue" },
  { href: "/county/disbursements", label: "Disbursements" },
  { href: "/county/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
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
