"use client";

/**
 * Purpose: Sidebar footer block that shows the signed-in user and exposes
 *          account actions (log out) via a dropdown.
 * Why important: Replaces the static "workspace" tile in every sidebar with a
 *                real account surface and wires Logout to NextAuth signOut.
 * Used by: StudentSidebar, AdminSidebar, OpsSidebar.
 */
import Link from "next/link";
import type { Route } from "next";
import { useSession, signOut } from "next-auth/react";
import { ChevronUp, LogOut, Settings, UserRound, type LucideIcon } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

const ROLE_LABELS: Record<string, string> = {
	STUDENT: "Student",
	WARD_ADMIN: "Ward Administrator",
	FINANCE_OFFICER: "Finance Officer",
	COUNTY_ADMIN: "County Administrator",
	PLATFORM_OPERATOR: "Platform Operator",
};

// Role -> account/profile destination. Each entry must be reachable by that
// role per ROLE_ACCESS_POLICY in lib/role-routing.ts; otherwise the middleware
// will silently redirect the user to their home. Roles with no per-account
// surface are intentionally absent — the menu item is hidden for them.
const ACCOUNT_LINK_BY_ROLE: Partial<
	Record<string, { href: Route; label: string; icon: LucideIcon }>
> = {
	STUDENT: { href: "/profile", label: "Profile", icon: UserRound },
	COUNTY_ADMIN: { href: "/settings", label: "Settings", icon: Settings },
};

function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
	const source = (name && name.trim()) || (email && email.split("@")[0]) || "";
	if (!source) return "U";
	const parts = source.split(/[\s._-]+/).filter(Boolean);
	if (parts.length === 0) return source.slice(0, 1).toUpperCase();
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SidebarUserMenu() {
	const { data: session, status } = useSession();
	const user = session?.user;
	const name = user?.fullName || user?.name || (user?.email?.split("@")[0] ?? "");
	const email = user?.email ?? "";
	const role = user?.role ? ROLE_LABELS[user.role] ?? user.role : "";
	const isLoading = status === "loading";
	const accountLink = user?.role ? ACCOUNT_LINK_BY_ROLE[user.role] : undefined;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-brand-50 data-[state=open]:text-brand-900"
							tooltip={name || "Account"}
							aria-label="Account menu"
						>
							<span
								aria-hidden
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-semibold text-white shadow-sm ring-1 ring-brand-900/10"
							>
								{isLoading ? "…" : initialsFor(name, email)}
							</span>
							<span className="grid min-w-0 flex-1 text-left leading-tight">
								<span className="truncate text-sm font-semibold text-brand-900">
									{isLoading ? "Loading…" : name || "Account"}
								</span>
								<span className="truncate text-xs text-gray-500">{role || email}</span>
							</span>
							<ChevronUp className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>

					<DropdownMenuContent
						side="top"
						align="end"
						sideOffset={8}
						className="w-[--radix-popper-anchor-width] min-w-[16rem] rounded-xl border-brand-100 bg-white p-1 shadow-lg"
					>
						<DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
							<span
								aria-hidden
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-semibold text-white shadow-sm ring-1 ring-brand-900/10"
							>
								{initialsFor(name, email)}
							</span>
							<span className="grid min-w-0 flex-1 leading-tight">
								<span className="truncate text-sm font-semibold text-brand-900">{name || "Account"}</span>
								<span className="truncate text-xs text-gray-500">{email}</span>
								{role ? (
									<span className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-county-primary">
										{role}
									</span>
								) : null}
							</span>
						</DropdownMenuLabel>

						<DropdownMenuSeparator />

						{accountLink ? (() => {
							const AccountIcon = accountLink.icon;
							return (
								<>
									<DropdownMenuItem
										className="gap-2 rounded-md px-2 py-2 text-sm text-brand-900 focus:bg-brand-50 focus:text-brand-900"
										asChild
									>
										<Link href={accountLink.href}>
											<AccountIcon className="h-4 w-4" />
											<span>{accountLink.label}</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							);
						})() : null}

						<DropdownMenuItem
							className="gap-2 rounded-md px-2 py-2 text-sm text-danger-700 focus:bg-danger-50 focus:text-danger-700"
							onSelect={(event) => {
								event.preventDefault();
								void signOut({ callbackUrl: "/login" });
							}}
						>
							<LogOut className="h-4 w-4" />
							<span>Sign out</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
