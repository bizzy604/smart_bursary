"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequestJson } from "@/lib/api-client";

export interface SubCountyOption {
	id: string;
	name: string;
	code?: string | null;
}

export interface WardOption {
	id: string;
	name: string;
	code?: string | null;
	subCountyId?: string | null;
}

export interface VillageOption {
	id: string;
	name: string;
	code?: string | null;
	wardId: string;
}

export function useSubCounties(countyId?: string) {
	const [subCounties, setSubCounties] = useState<SubCountyOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const reload = useCallback(async () => {
		if (!countyId) {
			setSubCounties([]);
			return;
		}
		setIsLoading(true);
		try {
			const res = await apiRequestJson<{ data: SubCountyOption[] }>("/locations/sub-counties");
			setSubCounties(res.data ?? []);
		} catch {
			setSubCounties([]);
		} finally {
			setIsLoading(false);
		}
	}, [countyId]);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { subCounties, isLoading, reload };
}

export function useWards(countyId?: string, subCountyId?: string | null) {
	const [wards, setWards] = useState<WardOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const reload = useCallback(async () => {
		setIsLoading(true);
		try {
			const parts: string[] = [];
			if (countyId) parts.push(`countyId=${encodeURIComponent(countyId)}`);
			if (subCountyId) parts.push(`subCountyId=${encodeURIComponent(subCountyId)}`);
			const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
			const res = await apiRequestJson<{ data: WardOption[] }>(`/locations/wards${qs}`);
			setWards(res.data ?? []);
		} catch {
			setWards([]);
		} finally {
			setIsLoading(false);
		}
	}, [countyId, subCountyId]);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { wards, isLoading, reload };
}

export function useVillageUnits(wardId?: string | null) {
	const [villages, setVillages] = useState<VillageOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const reload = useCallback(async () => {
		if (!wardId) {
			setVillages([]);
			return;
		}
		setIsLoading(true);
		try {
			const res = await apiRequestJson<{ data: VillageOption[] }>(`/locations/village-units?wardId=${encodeURIComponent(wardId)}`);
			setVillages(res.data ?? []);
		} catch {
			setVillages([]);
		} finally {
			setIsLoading(false);
		}
	}, [wardId]);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { villages, isLoading, reload };
}
