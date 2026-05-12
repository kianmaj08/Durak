import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          50: "#f7f6f3",
          100: "#edeae2",
          200: "#d9d3c4",
          300: "#bbb29c",
          400: "#8a8270",
          500: "#5e5849",
          600: "#3f3a30",
          700: "#2b2820",
          800: "#1a1813",
          900: "#0e0d09",
        },
        ember: {
          DEFAULT: "#d94a2b",
          dark: "#a83417",
          light: "#f57352",
        },
        gold: {
          DEFAULT: "#c9a64a",
          dark: "#8c7220",
          light: "#e6c97a",
        },
        felt: {
          DEFAULT: "#143d34",
          dark: "#0a2620",
          light: "#1f5648",
        },
      },
      animation: {
        "deal": "deal 0.4s ease-out forwards",
        "flip": "flip 0.5s ease-in-out forwards",
        "glow": "glow 2s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
      },
      keyframes: {
        deal: {
          "0%": { transform: "translate(-50%, -50%) rotate(0deg) scale(0.6)", opacity: "0" },
          "100%": { transform: "translate(0, 0) rotate(var(--rot, 0deg)) scale(1)", opacity: "1" },
        },
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(201, 166, 74, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(201, 166, 74, 0.7)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
