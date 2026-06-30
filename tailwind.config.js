/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Fredoka', 'sans-serif'],
      },
      colors: {
        'brand-orange': '#F97316',
        'brand-yellow': '#FACC15',
        'soft-yellow': '#FFFBEB',
      },
    },
  },
  plugins: [],
}
