/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0b1018",
        surface: "#131b27",
        lunar: "#c5cdff",
      },
      fontFamily: {
        sans: ["DM Sans Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Newsreader Variable", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
