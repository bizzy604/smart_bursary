import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
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
  			// Tenant branding (consumed via CSS variable). Status colours (success / warning /
  			// danger / error) and neutrals (gray) intentionally use Tailwind's default palettes.
  			county: {
  				primary: 'var(--county-primary)',
  				'primary-text': 'var(--county-primary-text)'
  			},
  			// shadcn/ui semantic tokens — backed by oklch CSS variables.
  			// `<alpha-value>` keeps Tailwind's `bg-primary/50` modifier syntax working.
  			background: 'oklch(var(--background) / <alpha-value>)',
  			foreground: 'oklch(var(--foreground) / <alpha-value>)',
  			card: {
  				DEFAULT: 'oklch(var(--card) / <alpha-value>)',
  				foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
  				foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
  			},
  			primary: {
  				DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
  				foreground: 'oklch(var(--primary-foreground) / <alpha-value>)'
  			},
  			secondary: {
  				DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
  				foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)'
  			},
  			muted: {
  				DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
  				foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
  				foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
  			},
  			destructive: {
  				DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
  				foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
  			},
  			border: 'oklch(var(--border) / <alpha-value>)',
  			input: 'oklch(var(--input) / <alpha-value>)',
  			ring: 'oklch(var(--ring) / <alpha-value>)',
  			chart: {
  				'1': 'oklch(var(--chart-1) / <alpha-value>)',
  				'2': 'oklch(var(--chart-2) / <alpha-value>)',
  				'3': 'oklch(var(--chart-3) / <alpha-value>)',
  				'4': 'oklch(var(--chart-4) / <alpha-value>)',
  				'5': 'oklch(var(--chart-5) / <alpha-value>)'
  			},
  			sidebar: {
  				DEFAULT: 'oklch(var(--sidebar) / <alpha-value>)',
  				foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)',
  				primary: 'oklch(var(--sidebar-primary) / <alpha-value>)',
  				'primary-foreground': 'oklch(var(--sidebar-primary-foreground) / <alpha-value>)',
  				accent: 'oklch(var(--sidebar-accent) / <alpha-value>)',
  				'accent-foreground': 'oklch(var(--sidebar-accent-foreground) / <alpha-value>)',
  				border: 'oklch(var(--sidebar-border) / <alpha-value>)',
  				ring: 'oklch(var(--sidebar-ring) / <alpha-value>)'
  			}
  		},
  		fontFamily: {
  			// Theme spec keys
  			sans: [
  				'var(--font-sans)',
  				'Oxanium',
  				'sans-serif'
  			],
  			serif: [
  				'var(--font-serif)',
  				'Playfair Display',
  				'ui-serif',
  				'serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'JetBrains Mono',
  				'ui-monospace',
  				'monospace'
  			]
  		},
  		borderRadius: {
  			sm: 'calc(var(--radius) - 4px)',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			DEFAULT: 'var(--shadow)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		animation: {
  			'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
  			'score-fill': 'score-fill 1s ease-out forwards',
  			'fade-in-up': 'fade-in-up 200ms ease-out',
  			'accordion-down': 'accordion-down 200ms ease-out',
  			'accordion-up': 'accordion-up 200ms ease-out'
  		},
  		keyframes: {
  			'pulse-ring': {
  				'0%, 100%': {
  					boxShadow: '0 0 0 0 oklch(var(--accent) / 0.4)'
  				},
  				'70%': {
  					boxShadow: '0 0 0 8px oklch(var(--accent) / 0)'
  				}
  			},
  			'fade-in-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'score-fill': {
  				from: {
  					strokeDashoffset: '283'
  				},
  				to: {
  					strokeDashoffset: 'var(--target-offset)'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		screens: {
  			xs: '320px',
  			sm: '375px',
  			md: '768px',
  			lg: '1024px',
  			xl: '1280px',
  			'2xl': '1536px'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
};

export default config;
