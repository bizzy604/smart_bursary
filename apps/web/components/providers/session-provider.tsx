"use client";

/**
 * Purpose: Wrap the React tree in NextAuth's SessionProvider and mirror the
 *          session state into the legacy auth-store/token-store so existing
 *          client code (api-client) keeps working unchanged.
 * Why important: Lets us migrate to NextAuth without rewriting every fetch site.
 * Used by: Root layout.
 */
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { tokenStore } from "@/lib/token-store";
import { useAuthStore } from "@/store/auth-store";

function SessionSync({ children }: { children: ReactNode }) {
	const { data: session, status } = useSession();
	const setSession = useAuthStore((state) => state.setSession);
	const clearSession = useAuthStore((state) => state.clearSession);

	useEffect(() => {
		if (status === "loading") {
			return;
		}
		if (session?.user && session.accessToken && !session.error) {
			tokenStore.set(session.accessToken);
			setSession({
				accessToken: session.accessToken,
				user: {
					id: session.user.id,
					email: session.user.email,
					role: session.user.role,
					full_name: session.user.fullName,
					profile_complete: true,
				},
			});
		} else {
			tokenStore.clear();
			clearSession();
		}
	}, [session, status, setSession, clearSession]);

	return <>{children}</>;
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
	return (
		<SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
			<SessionSync>{children}</SessionSync>
		</SessionProvider>
	);
}
