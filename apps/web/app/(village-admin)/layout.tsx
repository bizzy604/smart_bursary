import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CountyBrandingProvider } from "@/components/layout/county-branding-provider";
import { resolvePostLoginRoute } from "@/lib/role-routing";

/**
 * Layout for the village-admin route group (Commit 5c).
 *
 * Pinned to the `VILLAGE_ADMIN` role. Other roles are bounced to their own
 * landing route. The layout is intentionally minimal — village admins operate
 * a focused per-student allocation queue and don't need the multi-section
 * sidebar of the (admin) layout.
 */
export default async function VillageAdminLayout({ children }: { children: ReactNode }) {
	const session = await auth();
	if (!session?.user) {
		redirect("/login");
	}

	if (session.user.role !== "VILLAGE_ADMIN") {
		redirect(resolvePostLoginRoute(session.user.role));
	}

	const fullName = session.user.fullName?.trim() || "Village Administrator";

	return (
		<CountyBrandingProvider>
			<div className="min-h-screen bg-muted">
				<header className="border-b border-border bg-background">
					<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
						<div>
							<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Village Portal</p>
							<h1 className="font-serif text-lg font-semibold text-primary">
								Village Allocation Queue
							</h1>
						</div>
						<div className="text-right text-sm">
							<p className="font-medium text-foreground">{fullName}</p>
							<p className="text-xs text-muted-foreground">Village Administrator</p>
						</div>
					</div>
				</header>
				<main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
			</div>
		</CountyBrandingProvider>
	);
}
