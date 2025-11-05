/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        minecraft: {
          grass: '#7CB342',
          stone: '#607D8B',
          dirt: '#795548',
          dark: '#263238'
        }
      }
    },
  },
  plugins: [],
}
