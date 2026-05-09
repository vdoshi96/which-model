import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)",
        primary: "rgb(var(--color-text-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
        muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        cyan: "rgb(var(--color-cyan) / <alpha-value>)",
        success: "rgb(var(--color-green) / <alpha-value>)",
        warning: "rgb(var(--color-yellow) / <alpha-value>)",
        danger: "rgb(var(--color-red) / <alpha-value>)",
        raised: "rgb(var(--color-surface-raised) / <alpha-value>)",
        soft: "rgb(var(--color-surface-soft) / <alpha-value>)",
      },
      fontFamily: {
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
