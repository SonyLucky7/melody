/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        melody: {
          bg: '#0f0f13',
          card: '#18181f',
          cardHover: '#24242e',
          subtext: '#b3b3b3',
          border: '#2a2a35',
          brand: '#3b82f6', // Rich Melody blue / cyan accent from logo pack
          brandLight: '#60a5fa',
          brandGlow: 'rgba(59, 130, 246, 0.4)',
          emerald: '#10b981',
        }
      }
    },
  },
  plugins: [],
}
