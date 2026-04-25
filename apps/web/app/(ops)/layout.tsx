import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { OpsSidebar } from "@/components/layout/ops-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { resolvePostLoginRoute } from "@/lib/role-routing";

export default async function OpsLayout({ children }: { children: ReactNode }) {
	const session = await auth();
	if (!session?.user) {
		redirect("/login");
	}

	if (session.user.role !== "PLATFORM_OPERATOR") {
		redirect(resolvePostLoginRoute(session.user.role));
	}

	return (
		<CountyBrandingProvider>
			<SidebarProvider defaultOpen>
				<OpsSidebar />
				<SidebarInset>
					<div className="page-shell county-pattern bg-transparent pb-6">
						<header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur-sm">
							<div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
								<div>
									<div className="flex items-center gap-3">
										<SidebarTrigger />
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.14em] text-county-primary">Platform Operator</p>
											<h1 className="font-display text-lg font-semibold text-brand-900">Operations Console</h1>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<div className="text-right">
										<p className="text-sm font-semibold text-brand-900">{session.user.fullName || "System Operator"}</p>
										<p className="text-xs text-gray-500">Multi-tenant oversight</p>
									</div>
									<Button variant="outline" size="sm">Logout</Button>
								</div>
							</div>
						</header>

						<div className="w-full px-4 pb-6 pt-4 sm:px-6 lg:px-8">
							<main className="min-w-0 space-y-5">{children}</main>
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</CountyBrandingProvider>
	);
}
