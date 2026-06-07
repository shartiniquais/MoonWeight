/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#070A1F",
        surface: "#111633",
        card: "#171B3F",
        deep: "#2E145A",
        violet: "#7C3AED",
        lavender: "#C084FC",
        mystic: "#2563EB",
        bone: "#F3E8FF",
        periwinkle: "#A5B4FC",
        danger: "#FB7185",
        success: "#34D399",
      },
      boxShadow: {
        glow: "0 0 32px rgba(124, 58, 237, 0.22)",
        insetline: "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
