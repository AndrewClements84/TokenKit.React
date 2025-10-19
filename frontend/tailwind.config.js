/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1DB954', // Spotify green
          dark: '#0BA360',
          accent: '#3EA6FF' // Xbox-like accent
        }
      },
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 40px rgba(30, 215, 96, 0.25)'
      }
    },
  },
  plugins: [],
}