import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { resolvePostLoginRoute, type AppRole } from "@/lib/role-routing";

const ROLE_LABELS = {
	WARD_ADMIN: "Ward Administrator",
	FINANCE_OFFICER: "Finance Officer",
	COUNTY_ADMIN: "County Administrator",
	PLATFORM_OPERATOR: "Platform Operator",
	STUDENT: "Student",
} as const;

type AdminRole = "WARD_ADMIN" | "FINANCE_OFFICER" | "COUNTY_ADMIN";

function isAdminRole(role: AppRole): role is AdminRole {
	return role === "WARD_ADMIN" || role === "FINANCE_OFFICER" || role === "COUNTY_ADMIN";
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
	const session = await auth();
	if (!session?.user) {
		redirect("/login");
	}

	if (!isAdminRole(session.user.role)) {
		redirect(resolvePostLoginRoute(session.user.role));
	}

	const adminRole = session.user.role;
	const inCountySpace = adminRole !== "WARD_ADMIN";
	const userName = session.user.fullName?.trim() || (inCountySpace ? "County Officer" : "Ward Officer");
	const roleLabel = ROLE_LABELS[adminRole];
	const portalLabel =
		adminRole === "WARD_ADMIN"
			? "Ward Review Portal"
			: adminRole === "COUNTY_ADMIN"
				? "County Administration Portal"
				: "County Finance Portal";

	return (
		<CountyBrandingProvider>
			<SidebarProvider defaultOpen>
				<AdminSidebar role={adminRole} />
				<SidebarInset>
					<div className="page-shell county-pattern bg-transparent pb-6">
						<AdminHeader
							homeHref={resolvePostLoginRoute(adminRole)}
							portalLabel={portalLabel}
							userName={userName}
							roleLabel={roleLabel}
						/>

						<div className="w-full px-4 pb-6 pt-4 sm:px-6 lg:px-8">
							<main className="min-w-0 space-y-5">{children}</main>
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</CountyBrandingProvider>
	);
}
