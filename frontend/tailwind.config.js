/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#030612",
        secondary: "#0058be",
        tertiary: "#0a0025",
        background: "#f7f9fb",
        surface: "#f7f9fb",
      },
    },
  },
  plugins: [],
};
