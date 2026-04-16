import { create } from "zustand";
import type { AuthUser } from "@/lib/auth";

type AuthStatus = "idle" | "authenticated" | "unauthenticated";

interface AuthState {
	status: AuthStatus;
	accessToken: string | null;
	user: AuthUser | null;
	setSession: (session: { accessToken: string; user: AuthUser }) => void;
	clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	status: "idle",
	accessToken: null,
	user: null,
	setSession: ({ accessToken, user }) => {
		set({ status: "authenticated", accessToken, user });
	},
	clearSession: () => {
		set({ status: "unauthenticated", accessToken: null, user: null });
	},
}));

