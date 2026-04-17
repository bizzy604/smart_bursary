import type { Route } from "next";

export interface AdminNavigationItem {
  href: Route;
  label: string;
}

export const wardNavigationItems: AdminNavigationItem[] = [
  { href: "/ward/dashboard", label: "Dashboard" },
  { href: "/ward/applications", label: "Applications" },
  { href: "/ward/reports", label: "Reports" },
];

export const countyNavigationItems: AdminNavigationItem[] = [
  { href: "/county/dashboard", label: "Dashboard" },
  { href: "/county/review", label: "Review Queue" },
  { href: "/county/disbursements", label: "Disbursements" },
  { href: "/county/reports", label: "Reports" },
];
