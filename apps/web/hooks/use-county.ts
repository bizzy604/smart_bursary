"use client";

import { useCountyStore } from "@/store/county-store";

export function useCounty() {
	const county = useCountyStore((state) => state.county);
	const setCounty = useCountyStore((state) => state.setCounty);

	return {
		county,
		setCounty,
	};
}

