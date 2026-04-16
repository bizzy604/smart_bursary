import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./hooks/**/*.{ts,tsx}",
		"./lib/**/*.{ts,tsx}",
		"./store/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				brand: {
					50: "#EFF6FC",
					100: "#D6E8F5",
					300: "#6B9EC4",
					500: "#2E5F8F",
					700: "#1E3A5F",
					900: "#0D2B4E",
				},
				accent: {
					50: "#FEFAF0",
					100: "#FDF0D5",
					400: "#D4900D",
					500: "#C47D00",
					700: "#8A5700",
					900: "#5A3600",
				},
				success: {
					50: "#EDFBF4",
					100: "#D1F5E3",
					500: "#1E8A57",
					700: "#145C3A",
				},
				warning: {
					50: "#FFF8ED",
					100: "#FDECC8",
					500: "#B86500",
					700: "#7A4500",
				},
				danger: {
					50: "#FFF4F4",
					100: "#FDDEDE",
					500: "#C0392B",
					700: "#8B1A1A",
				},
				county: {
					primary: "var(--county-primary)",
					"primary-text": "var(--county-primary-text)",
				},
			},
			fontFamily: {
				display: ["var(--font-display)", "Plus Jakarta Sans", "DM Sans", "sans-serif"],
				body: ["var(--font-body)", "Noto Sans", "sans-serif"],
				mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
			},
			borderRadius: {
				sm: "4px",
				md: "8px",
				lg: "12px",
				xl: "16px",
				"2xl": "24px",
			},
			boxShadow: {
				xs: "0 1px 2px rgba(0,0,0,0.05)",
				sm: "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
				md: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
				lg: "0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)",
				xl: "0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04)",
			},
			animation: {
				"pulse-ring": "pulse-ring 2s ease-in-out infinite",
				"score-fill": "score-fill 1s ease-out forwards",
				"fade-in-up": "fade-in-up 200ms ease-out",
			},
			keyframes: {
				"pulse-ring": {
					"0%, 100%": { boxShadow: "0 0 0 0 rgba(196, 125, 0, 0.4)" },
					"70%": { boxShadow: "0 0 0 8px rgba(196, 125, 0, 0)" },
				},
				"fade-in-up": {
					"0%": { opacity: "0", transform: "translateY(8px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				"score-fill": {
					from: { strokeDashoffset: "283" },
					to: { strokeDashoffset: "var(--target-offset)" },
				},
			},
			screens: {
				xs: "320px",
				sm: "375px",
				md: "768px",
				lg: "1024px",
				xl: "1280px",
				"2xl": "1536px",
			},
		},
	},
	plugins: [],
};

export default config;
