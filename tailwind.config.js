/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 6px 10px -5px rgba(0, 0, 0, 0.02)',
        'premium-hover': '0 20px 40px -5px rgba(0, 0, 0, 0.06), 0 10px 20px -5px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
