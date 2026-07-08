/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0d1319',
        panel: '#131c26',
        edge: '#233140',
        sand: '#e8b64c',
        mist: '#8a97a3',
        paper: '#eef2ee',
        danger: '#e14d4d',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Cascadia Code"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
