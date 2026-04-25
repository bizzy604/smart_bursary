import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { StudentBottomNav } from "@/components/layout/student-bottom-nav";
import { StudentHeader } from "@/components/layout/student-header";
import { StudentSidebar } from "@/components/layout/student-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { canAccessPathForRole, resolvePostLoginRoute } from "@/lib/role-routing";

export default async function StudentLayout({ children }: { children: ReactNode }) {
	const session = await auth();
	if (!session?.user) {
		redirect("/login");
	}

	const role = session.user.role;
	if (!canAccessPathForRole(role, "/dashboard")) {
		redirect(resolvePostLoginRoute(role));
	}

	return (
		<CountyBrandingProvider>
			<SidebarProvider defaultOpen>
				<StudentSidebar />
				<SidebarInset>
					<div className="page-shell bg-transparent pb-20 md:pb-8">
						<StudentHeader />
						<div className="w-full px-4 pb-6 pt-0 sm:px-6 lg:px-8">
							<div className="min-w-0">{children}</div>
						</div>
						<StudentBottomNav />
					</div>
				</SidebarInset>
			</SidebarProvider>
		</CountyBrandingProvider>
	);
}
