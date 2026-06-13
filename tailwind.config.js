/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#030712',
          card: '#111827',
          border: '#1f2937',
          accent: '#fbbf24', // Premium golden amber for BUGGU
          success: '#10b981',
          danger: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
