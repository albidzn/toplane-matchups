/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0e14",
          900: "#0f1420",
          850: "#131a29",
          800: "#182233",
          700: "#1f2b40",
          600: "#2a3a55",
          500: "#3d5273",
        },
        gold: {
          400: "#f0c975",
          500: "#e8b04b",
          600: "#c68d2e",
        },
        hextech: {
          400: "#4fd8e8",
          500: "#2ebfd4",
        },
      },
      fontFamily: {
        display: ["Beaufort for LOL", "Cinzel", "Georgia", "serif"],
        sans: ["Spiegel", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(232,176,75,0.35), 0 8px 24px -6px rgba(0,0,0,0.6)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "70%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.18s ease-out both",
        "fade-slide-up": "fadeSlideUp 0.22s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.14s cubic-bezier(0.16,1,0.3,1) both",
        "pop-in": "popIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
