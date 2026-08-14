/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        'accent-1': 'var(--accent-1)',
        'accent-2': 'var(--accent-2)',
        neutral: 'var(--neutral)',
        border: 'var(--border)',
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-active': 'var(--sidebar-active-bg)',
        'card-bg': 'var(--card-bg)',
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
