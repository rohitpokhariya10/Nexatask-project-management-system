/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10213f',
        navy: '#132646',
        accent: '#2f6fed',
        canvas: '#f4f7fb',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,33,63,.05), 0 8px 24px rgba(16,33,63,.06)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
