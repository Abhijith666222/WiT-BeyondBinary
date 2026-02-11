import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./modes/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#F0BFCF",
          rose: "#E8A3B5",
          lavender: "#CFC2EA",
          "muted-rose": "#E8A3B5",
          "lavender-tone": "#CFC2EA",
          "soft-peach": "#F3C6B2",
          "text-primary": "#2B2B2B",
          "text-secondary": "#6B6B6B",
          "text-header": "#2A2433",
          "bg-light": "#FAF4F7",
          "bg-lighter": "#F4EEF6",
          /* Legacy aliases */
          navy: "#2A2433",
          "navy-light": "#6B6B6B",
          cyan: "#E8A3B5",
          "cyan-dim": "#F0BFCF",
          "cyan-glow": "rgba(210, 140, 170, 0.35)",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
        pill: "9999px",
      },
      boxShadow: {
        soft: "0 6px 20px rgba(180, 120, 150, 0.15)",
        "soft-hover": "0 14px 36px rgba(180, 120, 150, 0.22), 0 4px 12px rgba(200, 150, 170, 0.12)",
        "card-depth":
          "0 10px 30px rgba(180, 120, 150, 0.18), 0 2px 8px rgba(200, 150, 170, 0.10)",
        "card-depth-hover":
          "0 14px 36px rgba(180, 120, 150, 0.22), 0 4px 12px rgba(200, 150, 170, 0.12)",
        glass: "0 10px 30px rgba(180, 120, 150, 0.18), 0 2px 8px rgba(200, 150, 170, 0.10)",
        "button-glow": "0 8px 22px rgba(210, 140, 170, 0.35)",
        "button-press": "inset 0 2px 4px rgba(0,0,0,0.08)",
        glow: "0 0 30px -5px rgba(210, 140, 170, 0.35)",
        "glow-sm": "0 0 16px -4px rgba(232, 163, 181, 0.4)",
      },
      transitionDuration: {
        DEFAULT: "250ms",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
