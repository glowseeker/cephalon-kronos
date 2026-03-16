/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kronos: {
          bg: 'var(--color-bg)',
          panel: 'var(--color-panel)',
          accent: 'var(--color-accent)',
          text: 'var(--color-text)',
          dim: 'var(--color-text-dim)',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        hologram: '0 0 15px var(--glow-color)',
      }
    },
  },
  plugins: [],
}