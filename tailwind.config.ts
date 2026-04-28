import type { Config } from "tailwindcss";

// Tokens mirror DESIGN.md — single source of truth is DESIGN.md.
// When editing this file, update DESIGN.md first.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals
        bg: "#fafaf8",
        fg: "#0a0a0a",
        "fg-muted": "#4a4a48",
        "fg-quiet": "#8b8a86",
        rule: "#e7e5e0",
        // Brand accent (single color, sparing use)
        accent: {
          DEFAULT: "#1d5a3a",
          hover: "#184a30",
          fg: "#ffffff",
        },
      },
      fontFamily: {
        // Chinese-first system stack — see app/layout.tsx for why we don't
        // load Google Fonts. Order: macOS → Windows → generic fallback.
        sans: [
          "PingFang SC",
          "Microsoft YaHei",
          "Hiragino Sans GB",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        latin: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      fontSize: {
        // Mobile-first sizes; desktop bumps via responsive prefix
        hero: ["2.5rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.01em" }],
        "hero-lg": ["4rem", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.01em" }],
        h1: ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        "h1-lg": ["2.75rem", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
        "h2-lg": ["1.75rem", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        sub: ["0.875rem", { lineHeight: "1.5" }],
        "sub-lg": ["0.9375rem", { lineHeight: "1.5" }],
        meta: ["0.75rem", { lineHeight: "1.4" }],
        "meta-lg": ["0.8125rem", { lineHeight: "1.4" }],
      },
      spacing: {
        // 8pt grid per DESIGN.md §3
        "4": "0.25rem",
        "8": "0.5rem",
        "12": "0.75rem",
        "16": "1rem",
        "24": "1.5rem",
        "32": "2rem",
        "48": "3rem",
        "64": "4rem",
        "96": "6rem",
        "128": "8rem",
        "160": "10rem",
      },
      maxWidth: {
        prose: "72ch",
        headline: "48ch",
        app: "60rem", // 960px dashboard max-width
      },
      transitionTimingFunction: {
        "design-ease": "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
