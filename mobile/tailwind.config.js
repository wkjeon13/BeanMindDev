/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdfcfb',
          100: '#fcfaf8',
          200: '#f8f4ed',
          300: '#e5dbcb',
          400: '#d0ba9e',
          500: '#ab8256',
          600: '#9b7147',
          700: '#825c3b',
          800: '#694a32',
          900: '#563e2a',
          950: '#2e2015',
        },
        espresso: {
          50: '#f5f4f2',
          100: '#e6e3df',
          200: '#d3cec7',
          300: '#b8b0a7',
          400: '#a3988c',
          500: '#897c74',
          600: '#695e57',
          700: '#564d47',
          800: '#463f3a',
          900: '#2e2a27',
          950: '#1c1a19',
        }
      }
    },
  },
  plugins: [],
}
