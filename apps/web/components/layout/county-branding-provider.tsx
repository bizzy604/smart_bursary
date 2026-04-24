"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useCounty } from "@/hooks/use-county";
import { fetchCountyBranding } from "@/lib/admin-settings";
import { hexToHslChannels } from "@/lib/utils";

export function CountyBrandingProvider({ children }: { children: ReactNode }) {
	const { county, setCounty } = useCounty();

	useEffect(() => {
		let mounted = true;

		void fetchCountyBranding()
			.then((branding) => {
				if (!mounted) {
					return;
				}

				setCounty({
					name: branding.countyName,
					fundName: branding.fundName,
					logoText: branding.logoText,
					primaryColor: branding.primaryColor,
					legalReference: branding.legalReference,
				});
			})
			.catch(() => {
				// Keep static defaults when county settings are unavailable.
			});

		return () => {
			mounted = false;
		};
	}, [setCounty]);

	useEffect(() => {
		const root = document.documentElement;
		root.style.setProperty("--county-primary", county.primaryColor);
		root.style.setProperty("--county-primary-text", "#FFFFFF");

		// Mirror the tenant primary into shadcn's HSL variable so any shadcn-styled
		// surface (buttons, focus rings, selection chips, chart-1) picks up the brand.
		const hsl = hexToHslChannels(county.primaryColor);
		if (hsl) {
			root.style.setProperty("--primary", hsl);
			root.style.setProperty("--ring", hsl);
			root.style.setProperty("--primary-foreground", "0 0% 100%");
			root.style.setProperty("--chart-1", hsl);
		}
	}, [county.primaryColor]);

	return <>{children}</>;
}
