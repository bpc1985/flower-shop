import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFFBF5",
          100: "#FFF8F0",
          200: "#FFF2E0",
          300: "#FFE8CC",
        },
        sage: {
          300: "#C5D1B8",
          400: "#B1C1A0",
          500: "#9CAF88",
          600: "#7D9468",
          700: "#637A4F",
        },
        blush: {
          200: "#F5D9DC",
          300: "#EEC8CC",
          400: "#E8B4B8",
          500: "#D9959A",
          600: "#C7787E",
        },
        burgundy: {
          400: "#8B3A4A",
          500: "#7A3341",
          600: "#6B2737",
          700: "#5A1F2D",
          800: "#4A1824",
        },
        warm: {
          800: "#2D2420",
          900: "#1A1410",
        },
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Georgia", "serif"],
        ui: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
