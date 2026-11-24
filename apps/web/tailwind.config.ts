import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1D4ED8',
          hover: '#1E40AF',
          subtle: '#EFF6FF',
        },
      },
    },
  },
  plugins: [],
};

export default config;
