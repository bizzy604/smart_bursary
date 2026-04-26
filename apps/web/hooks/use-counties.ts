"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequestJson } from "@/lib/api-client";

export interface CountyOption {
	id: string;
	slug: string;
	name: string;
}

export function useCounties() {
	const [counties, setCounties] = useState<CountyOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setIsLoading(true);
		try {
			const rows = await apiRequestJson<CountyOption[]>("/auth/counties");
			setCounties(rows ?? []);
			setError(null);
		} catch (reason: unknown) {
			const message = reason instanceof Error ? reason.message : "Failed to load counties.";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { counties, isLoading, error };
}
