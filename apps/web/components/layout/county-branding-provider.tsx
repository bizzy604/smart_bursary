"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useCounty } from "@/hooks/use-county";

export function CountyBrandingProvider({ children }: { children: ReactNode }) {
	const { county } = useCounty();

	useEffect(() => {
		document.documentElement.style.setProperty("--county-primary", county.primaryColor);
		document.documentElement.style.setProperty("--county-primary-text", "#FFFFFF");
	}, [county.primaryColor]);

	return <>{children}</>;
}

