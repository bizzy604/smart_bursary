import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Convert a `#RRGGBB` or `#RGB` hex string into the `H S% L%` channel form
 * expected by shadcn CSS variables (e.g. `--primary: 210 52% 25%`).
 * Returns `null` for unparseable inputs so callers can fall back gracefully.
 */
export function hexToHslChannels(hex: string): string | null {
	const cleaned = hex.trim().replace(/^#/, "");
	const normalized =
		cleaned.length === 3
			? cleaned
					.split("")
					.map((c) => c + c)
					.join("")
			: cleaned;
	if (normalized.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

	const r = parseInt(normalized.slice(0, 2), 16) / 255;
	const g = parseInt(normalized.slice(2, 4), 16) / 255;
	const b = parseInt(normalized.slice(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h *= 60;
	}

	return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
