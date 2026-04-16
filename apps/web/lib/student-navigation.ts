import type { Route } from "next";

export interface StudentNavigationItem {
  href: Route;
  label: string;
}

export const studentNavigationItems: StudentNavigationItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/programs", label: "Programs" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];
