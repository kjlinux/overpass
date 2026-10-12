import type { Config } from "tailwindcss";

const colors = {
  paper: "var(--color-paper)",
  surface: "var(--color-surface)",
  raised: "var(--color-surface-raised)",
  rule: "var(--color-rule)",
  "rule-strong": "var(--color-rule-strong)",
  ink: "var(--color-ink)",
  "ink-2": "var(--color-ink-2)",
  accent: "var(--color-accent)",
  "accent-active": "var(--color-accent-active)",
  "accent-ink": "var(--color-accent-ink)",
  "accent-surface": "var(--color-accent-surface)",
  success: "var(--color-success)",
  "success-surface": "var(--color-success-surface)",
  warning: "var(--color-warning)",
  "warning-surface": "var(--color-warning-surface)",
  danger: "var(--color-danger)",
  "danger-active": "var(--color-danger-active)",
  "danger-surface": "var(--color-danger-surface)",
  focus: "var(--color-focus)",
};

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: { ...colors, transparent: "transparent", current: "currentColor" },
    fontFamily: { text: "var(--font-text)", code: "var(--font-code)" },
    fontSize: {
      caption: ["14px", { lineHeight: "1.5" }],
      code: ["15px", { lineHeight: "1.6" }],
      body: ["16px", { lineHeight: "1.6" }],
      h3: ["20px", { lineHeight: "1.4", letterSpacing: "0" }],
      h2: ["24px", { lineHeight: "1.3" }],
      h1: ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      display: ["40px", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
      "display-lg": ["48px", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
    },
    borderRadius: { none: "0", full: "9999px" },
    boxShadow: { none: "none", raised: "var(--shadow-raised)" },
    extend: {
      maxWidth: { frame: "1200px", prose: "72ch" },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
      transitionDuration: { fast: "150ms", base: "200ms", slow: "250ms" },
    },
  },
  plugins: [],
} satisfies Config;
