import type { Config } from "tailwindcss";

/*
 * Operations-console design system. Every value here is fixed by spec —
 * there is no "close enough" shade. If a color is not in this file it does not
 * belong in the product.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        panel: "#141A21",
        // Recessed wells and zebra rows sit *below* the panel plane.
        "panel-alt": "#0F151B",
        line: "#1F2933",

        fg: "#E6EDF3",
        "fg-muted": "#8B949E",
        "fg-dim": "#6E7681",

        // Interactive and selected states only. Never severity, never a series.
        accent: "#4DD4E8",

        nominal: "#3FB950",
        caution: "#D29922",
        critical: "#F85149",
      },
      borderColor: {
        DEFAULT: "#1F2933",
      },
      // Five steps, no more. Named by pixel size so the scale is unmissable
      // at the call site.
      fontSize: {
        "11": ["11px", { lineHeight: "16px" }],
        "13": ["13px", { lineHeight: "18px" }],
        "15": ["15px", { lineHeight: "22px" }],
        "20": ["20px", { lineHeight: "26px" }],
        "28": ["28px", { lineHeight: "34px" }],
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.08em",
      },
      borderRadius: {
        // 4px is the ceiling for the whole product.
        DEFAULT: "2px",
        sm: "2px",
        md: "4px",
      },
      spacing: {
        rail: "56px",
        strip: "40px",
        sources: "72px",
        queue: "376px",
        planner: "400px",
      },
      transitionTimingFunction: {
        // Apple's standard ease — used for glass surfaces and overlays.
        glass: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
