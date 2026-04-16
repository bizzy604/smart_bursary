"use client";

import { useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved";

interface UseAutoSaveParams<T> {
	value: T;
	onSave: (value: T) => void | Promise<void>;
	delay?: number;
	enabled?: boolean;
}

export function useAutoSave<T>({
	value,
	onSave,
	delay = 600,
	enabled = true,
}: UseAutoSaveParams<T>): AutoSaveStatus {
	const [status, setStatus] = useState<AutoSaveStatus>("idle");
	const hasHydrated = useRef(false);
	const payload = JSON.stringify(value);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		if (!hasHydrated.current) {
			hasHydrated.current = true;
			return;
		}

		let cancelled = false;
		setStatus("saving");

		const timer = window.setTimeout(async () => {
			await Promise.resolve(onSave(value));
			if (!cancelled) {
				setStatus("saved");
			}
		}, delay);

		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [payload, value, delay, enabled, onSave]);

	return status;
}

