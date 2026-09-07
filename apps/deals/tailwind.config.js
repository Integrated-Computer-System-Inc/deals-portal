/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/onborda/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-rgb, 255 255 255) / <alpha-value>)',
        foreground: 'var(--foreground)',
        text: 'var(--text)',
        'text-info': 'var(--text-info)',
        primary: 'var(--primary)',
        'accent-1': 'var(--accent-1)',
        'accent-2': 'var(--accent-2)',
        neutral: 'rgb(var(--neutral-rgb, 248 250 252) / <alpha-value>)',
        border: 'rgb(var(--border-rgb, 217 218 219) / <alpha-value>)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted)',
        sidebar: 'var(--sidebar-bg)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-active': 'var(--sidebar-active-bg)',
        'sidebar-active-text': 'var(--sidebar-active-text)',
        'card-bg': 'rgb(var(--card-rgb, 255 255 255) / <alpha-value>)',
        'hover-bg': 'var(--hover-bg)',
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#026597',
          700: '#034e75',
          900: '#072d42',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm, 4px)',
        md: 'var(--radius-md, 8px)',
        lg: 'var(--radius-lg, 12px)',
        xl: 'var(--radius-xl, 16px)',
        '2xl': 'var(--radius-2xl, 20px)',
      },
    },
  },
  plugins: [],
};
