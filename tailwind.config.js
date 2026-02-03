/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        'tertiary-hover': 'var(--color-tertiary-hover)',
      },
      boxShadow: {
        primary: '0 8px 16px rgba(255, 122, 0, 0.35)',
        'primary-hover': '0 10px 22px rgba(255, 122, 0, 0.45)',
        'primary-active': '0 6px 12px rgba(255, 122, 0, 0.4)',
      },
    },
  },
  plugins: [],
}

