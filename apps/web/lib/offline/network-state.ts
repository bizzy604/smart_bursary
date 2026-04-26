/**
 * Purpose: Track browser online/offline state and expose it as a React hook.
 * Why important: Drives the offline UI banner + triggers the sync engine when
 *                connectivity is restored.
 * Used by: components/providers/pwa-provider.tsx and any UI that wants to
 *          render an offline indicator.
 */

"use client";

import { useEffect, useState } from "react";

function readInitialOnline(): boolean {
	if (typeof navigator === "undefined") return true;
	return navigator.onLine;
}

/**
 * React hook returning the current online/offline state. Safe to call in SSR —
 * it defaults to `true` server-side and hydrates to the actual value on the
 * client during the first effect tick.
 */
export function useOnline(): boolean {
	const [online, setOnline] = useState(readInitialOnline);

	useEffect(() => {
		const onOnline = () => setOnline(true);
		const onOffline = () => setOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		// Hydrate in case the SSR default disagrees with the live state.
		setOnline(navigator.onLine);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, []);

	return online;
}

/**
 * Imperative observer for non-React code paths (e.g., the sync engine).
 * Returns the unsubscribe function.
 */
export function subscribeOnlineChanges(listener: (online: boolean) => void): () => void {
	if (typeof window === "undefined") return () => {};
	const onOnline = () => listener(true);
	const onOffline = () => listener(false);
	window.addEventListener("online", onOnline);
	window.addEventListener("offline", onOffline);
	return () => {
		window.removeEventListener("online", onOnline);
		window.removeEventListener("offline", onOffline);
	};
}
