/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F3F8F6',
        ink: '#16302B',
        primary: {
          DEFAULT: '#0F7B6C',
          hover: '#0c6256',
        },
        accent: {
          DEFAULT: '#FFB400',
          hover: '#e5a200',
        },
        support: {
          DEFAULT: '#FF7A90',
          hover: '#e6657a',
        },
        danger: {
          DEFAULT: '#D6455D',
          hover: '#bf3950',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
