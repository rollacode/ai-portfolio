import type { Config } from "tailwindcss";

// Shared components speak in lime and gray; on Andrey's site those names resolve to the Domios palette.
const domiosBlue = {
  50: "#ddf4ff",
  100: "#b6e3ff",
  200: "#80ccff",
  300: "#79c0ff",
  400: "#58a6ff",
  500: "#388bfd",
  600: "#0969da",
  700: "#0550ae",
  800: "#033d8b",
  900: "#0a3069",
  950: "#051d4d",
};

const domiosSlate = {
  50: "#f6f8fa",
  100: "#eef2f6",
  200: "#dfe5ec",
  300: "#c4ccd5",
  400: "#919ca9",
  500: "#697889",
  600: "#4f5d6c",
  700: "#364350",
  800: "#222d39",
  900: "#161f29",
  950: "#0b1016",
};

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/core/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        black: "#0b1016",
        lime: domiosBlue,
        gray: domiosSlate,
        neutral: domiosSlate,
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Segoe UI", "Avenir Next", "Helvetica Neue", "sans-serif"],
        mono: ["var(--font-mono)", "Cascadia Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
