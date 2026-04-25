import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Bell, Search } from "lucide-react";

import { auth } from "@/auth";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { OpsSidebar } from "@/components/layout/ops-sidebar";
import { Input } from "@/components/ui/input";
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
					<div className="page-shell bg-transparent pb-6">
						<header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/65">
							<div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
								<SidebarTrigger className="-ml-1 text-gray-500 hover:text-brand-900" />
								<div className="hidden min-w-0 flex-col leading-tight md:flex">
									<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-county-primary">
										Platform Operator
									</span>
									<span className="truncate text-sm font-semibold text-brand-900">Operations Console</span>
								</div>

								<div className="ml-auto flex items-center gap-2">
									<div className="relative hidden w-80 max-w-md items-center md:flex">
										<Search aria-hidden className="absolute left-3 h-4 w-4 text-gray-400" />
										<Input
											type="search"
											placeholder="Search tenants, services, incidents…"
											className="h-9 rounded-lg border-gray-200 bg-gray-50/70 pl-9 text-sm focus-visible:bg-white"
										/>
									</div>
									<button
										type="button"
										aria-label="Notifications"
										className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-900"
									>
										<Bell className="h-4 w-4" />
										<span aria-hidden className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-county-primary" />
									</button>
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
