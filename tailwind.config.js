/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        tech: {
          border: '#4f46e5',
          bg: '#eef2ff',
          text: '#4338ca',
        },
        marketing: {
          border: '#f97316',
          bg: '#fff7ed',
          text: '#c2410c',
        }
      }
    }
  },
  plugins: [],
}
