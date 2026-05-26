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
          50:  '#F0ECFF',
          100: '#E4DEFF',
          200: '#C9BBFF',
          300: '#A897FF',
          400: '#8B72FF',
          500: '#6C47FF',
          600: '#5B38F5',
          700: '#4829E0',
          800: '#3520C4',
          900: '#1A1033',
        },
        coral: {
          50:  '#FFF3EE',
          100: '#FFE4D5',
          400: '#FF8A5B',
          500: '#FF6B35',
          600: '#E55520',
        },
        tech: {
          border: '#5B38F5',
          bg:     '#F0ECFF',
          text:   '#4829E0',
        },
        marketing: {
          border: '#f97316',
          bg:     '#fff7ed',
          text:   '#c2410c',
        },
      }
    }
  },
  plugins: [],
}
