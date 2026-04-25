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
  			brand: {
  				'50': '#EFF6FC',
  				'100': '#D6E8F5',
  				'300': '#6B9EC4',
  				'500': '#2E5F8F',
  				'700': '#1E3A5F',
  				'900': '#0D2B4E'
  			},
  			accent: {
  				'50': '#FEFAF0',
  				'100': '#FDF0D5',
  				'400': '#D4900D',
  				'500': '#C47D00',
  				'700': '#8A5700',
  				'900': '#5A3600',
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			success: {
  				'50': '#EDFBF4',
  				'100': '#D1F5E3',
  				'500': '#1E8A57',
  				'700': '#145C3A'
  			},
  			warning: {
  				'50': '#FFF8ED',
  				'100': '#FDECC8',
  				'500': '#B86500',
  				'700': '#7A4500'
  			},
  			danger: {
  				'50': '#FFF4F4',
  				'100': '#FDDEDE',
  				'500': '#C0392B',
  				'700': '#8B1A1A'
  			},
  			county: {
  				primary: 'var(--county-primary)',
  				'primary-text': 'var(--county-primary-text)'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			display: [
  				'var(--font-display)',
  				'Plus Jakarta Sans',
  				'DM Sans',
  				'sans-serif'
  			],
  			body: [
  				'var(--font-body)',
  				'Noto Sans',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'JetBrains Mono',
  				'monospace'
  			]
  		},
  		borderRadius: {
  			sm: 'calc(var(--radius) - 6px)',
  			md: 'calc(var(--radius) - 4px)',
  			lg: 'var(--radius)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 12px)'
  		},
  		boxShadow: {
  			xs: '0 1px 2px rgba(0,0,0,0.05)',
  			sm: '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
  			md: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
  			lg: '0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)',
  			xl: '0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04)'
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
  					boxShadow: '0 0 0 0 rgba(196, 125, 0, 0.4)'
  				},
  				'70%': {
  					boxShadow: '0 0 0 8px rgba(196, 125, 0, 0)'
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
