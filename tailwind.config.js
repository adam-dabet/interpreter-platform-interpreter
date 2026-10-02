/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0A1128',
          700: '#152044',
        },
        gold: {
          DEFAULT: '#B88E3E',
          50: '#FBF6EC',
        },
        canvas: '#F4F5F7',
      },
    },
  },
  plugins: [],
}

