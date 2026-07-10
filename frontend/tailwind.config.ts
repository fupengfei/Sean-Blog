import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#002045',
          container: '#1a365d',
          fixed: '#d6e3ff',
        },
        secondary: {
          DEFAULT: '#0a6c44',
          container: '#9ff5c1',
        },
        surface: {
          DEFAULT: '#f9f9ff',
          'container-lowest': '#ffffff',
          'container-low': '#f1f3ff',
          container: '#e8eeff',
          'container-high': '#e3e8f9',
          'container-highest': '#dde2f3',
        },
        'on-surface': '#161c27',
        'on-surface-variant': '#43474e',
        'on-primary': '#ffffff',
        'on-primary-container': '#86a0cd',
        'on-secondary': '#ffffff',
        'outline-variant': '#c4c6cf',
        outline: '#74777f',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['"Source Serif 4"', 'serif'],
        ui: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
