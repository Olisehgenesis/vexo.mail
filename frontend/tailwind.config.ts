import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef5ff',
          100: '#d9e8ff',
          200: '#bcd7ff',
          300: '#8bbeff',
          400: '#559bff',
          500: '#2979ff',
          600: '#1258f1',
          700: '#0d43dd',
          800: '#1037b3',
          900: '#13348f',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'float1': 'float1 10s ease-in-out infinite',
        'float2': 'float2 15s ease-in-out infinite',
        'float3': 'float3 12s ease-in-out infinite',
      },
      keyframes: {
        float1: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-20px) translateX(10px)' },
        },
        float2: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(20px) translateX(-15px)' },
        },
        float3: {
          '0%, 100%': { transform: 'translateY(0) translateX(0) scale(1)' },
          '50%': { transform: 'translateY(-15px) translateX(5px) scale(1.05)' },
        },
      },
    }, 
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      }
    
  },
  plugins: [],
};
export default config;

