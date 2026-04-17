"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useCounty } from "@/hooks/use-county";
import { fetchAdminSettings } from "@/lib/admin-settings";

export function CountyBrandingProvider({ children }: { children: ReactNode }) {
	const { county, setCounty } = useCounty();

	useEffect(() => {
		let mounted = true;

		void fetchAdminSettings()
			.then((settings) => {
				if (!mounted) {
					return;
				}

				setCounty({
					name: settings.branding.countyName,
					fundName: settings.branding.fundName,
					logoText: settings.branding.logoText,
					primaryColor: settings.branding.primaryColor,
					legalReference: settings.branding.legalReference,
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
		document.documentElement.style.setProperty("--county-primary", county.primaryColor);
		document.documentElement.style.setProperty("--county-primary-text", "#FFFFFF");
	}, [county.primaryColor]);

	return <>{children}</>;
}

