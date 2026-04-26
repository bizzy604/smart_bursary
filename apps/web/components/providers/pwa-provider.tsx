"use client";

/**
 * Purpose: Register the service worker and start the offline sync engine
 *          on first paint. Exposes the live offline state to the rest of
 *          the app via `useOnlineState()`.
 * Why important: Without this provider mounted, the service worker never
 *                installs and the IDB outbox never drains.
 * Used by: app/layout.tsx (top-level layout) — wrap the entire client tree.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { drainOutboxOnce, startSyncEngine } from "@/lib/offline/sync-engine";
import { useOnline } from "@/lib/offline/network-state";

interface PwaContextValue {
	online: boolean;
	/** Imperative trigger for code paths that want to drain the outbox now. */
	syncNow: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
	const online = useOnline();
	const [syncing, setSyncing] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Register the service worker. Failures are non-fatal — the app is
		// fully functional without offline support.
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/service-worker.js").catch((error) => {
				console.warn("[pwa] service worker registration failed", error);
			});
		}

		const stop = startSyncEngine();
		return () => stop();
	}, []);

	const syncNow = useMemo(
		() => async () => {
			if (syncing) return;
			setSyncing(true);
			try {
				await drainOutboxOnce();
			} finally {
				setSyncing(false);
			}
		},
		[syncing],
	);

	const value = useMemo<PwaContextValue>(() => ({ online, syncNow }), [online, syncNow]);

	return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function useOnlineState(): PwaContextValue {
	const ctx = useContext(PwaContext);
	if (!ctx) {
		// Allow code paths outside the provider tree (tests, SSR helpers) to
		// degrade gracefully rather than throw.
		return { online: true, syncNow: async () => {} };
	}
	return ctx;
}
