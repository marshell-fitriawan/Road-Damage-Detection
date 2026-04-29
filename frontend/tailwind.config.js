/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e94560',
        secondary: '#1a1a2e',
        accent: '#16213e',
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
      }
    },
  },
  plugins: [],
}
