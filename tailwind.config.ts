
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "0.75rem",
        sm: "1rem",
        md: "1.5rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
    },
    extend: {
      fontFamily: {
<<<<<<< HEAD
        sans: ['Inter', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
=======
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
<<<<<<< HEAD
        // Logo-inspired colors (Legacy)
        expendx: {
          blue: "#00AAFF",
          green: "#b6e600", // Updated to neon lime
          gray: {
            light: "#f4f4f6", // Updated
            medium: "#6e6e73", // Updated
            dark: "#111111"    // Updated
=======
        // Logo-inspired colors
        expendx: {
          blue: "#00AAFF",
          green: "#A3CE22",
          gray: {
            light: "#F3F4F6",
            medium: "#9CA3AF",
            dark: "#4B5563"
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
          }
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontSize: {
<<<<<<< HEAD
        xs: ["0.725rem", { lineHeight: "1rem", fontWeight: "400" }],
        sm: ["0.825rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        base: ["0.95rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        lg: ["1.125rem", { lineHeight: "1.75rem", fontWeight: "500" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "500" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", fontWeight: "600" }],
=======
        xs: ["0.7rem", { lineHeight: "1rem", fontWeight: "400" }],
        sm: ["0.8rem", { lineHeight: "1.125rem", fontWeight: "400" }],
        base: ["0.9rem", { lineHeight: "1.375rem", fontWeight: "400" }],
        lg: ["1rem", { lineHeight: "1.5rem", fontWeight: "500" }],
        xl: ["1.125rem", { lineHeight: "1.625rem", fontWeight: "500" }],
        "2xl": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        "3xl": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        "4xl": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600" }],
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      },
      spacing: {
        // Compact spacing scale
        "1.5": "0.375rem",
        "2.5": "0.625rem",
        "3.5": "0.875rem",
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
      },
      boxShadow: {
<<<<<<< HEAD
        // Soft shadow system
        'sm': '0 6px 20px rgba(0,0,0,0.06)',
        'DEFAULT': '0 12px 30px rgba(0,0,0,0.08)',
        'md': '0 12px 30px rgba(0,0,0,0.08)',
        'lg': '0 20px 50px rgba(0,0,0,0.12)',
        'card': '0 20px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
=======
        // Subtle shadow system
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'md': '0 3px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'lg': '0 8px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        'card': '0 2px 6px -2px rgba(0, 0, 0, 0.04), 0 1px 3px -1px rgba(0, 0, 0, 0.08)',
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
        'dropdown': '0 3px 10px rgba(0, 0, 0, 0.06)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        slideIn: {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(10%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.5s ease-out",
        shimmer: "shimmer 2s infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        bounce: "bounce 1s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        slideIn: "slideIn 0.3s ease-out",
        slideUp: "slideUp 0.3s ease-out",
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      height: {
        'screen-small': '100svh',
      },
      minHeight: {
        'screen-small': '100svh',
      },
      maxHeight: {
        'screen-small': '100svh',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
