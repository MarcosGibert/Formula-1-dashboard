/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        f1red: '#e10600',
        carbon: '#15151e',
        panel: '#1f1f2b',
      },
    },
  },
  plugins: [],
}
