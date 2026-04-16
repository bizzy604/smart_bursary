"use client";

import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
	const status = useAuthStore((state) => state.status);
	const accessToken = useAuthStore((state) => state.accessToken);
	const user = useAuthStore((state) => state.user);
	const setSession = useAuthStore((state) => state.setSession);
	const clearSession = useAuthStore((state) => state.clearSession);

	return {
		status,
		accessToken,
		user,
		setSession,
		clearSession,
		isAuthenticated: status === "authenticated",
	};
}

