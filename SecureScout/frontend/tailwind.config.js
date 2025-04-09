/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#e6f7ff',
          DEFAULT: '#1890ff',
          dark: '#096dd9'
        },
        secondary: {
          light: '#f5f7fa',
          DEFAULT: '#666666',
          dark: '#333333'
        },
        success: '#52c41a',
        warning: '#faad14',
        danger: '#f5222d',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
} 