/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "ui-sans-serif", "system-ui"]
      },
      colors: {
        primary: {
          DEFAULT: "#0E7490",
          dark: "#0A516B",
          light: "#38BDF8"
        }
      }
    },
  },
  plugins: [],
}

