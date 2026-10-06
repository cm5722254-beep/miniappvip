/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Premium cinema dark theme
        cinema: {
          bg: '#0a0a0f',
          panel: '#12121a',
          card: '#1a1a25',
          border: '#2a2a3a',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f0d060',
          dark: '#a88820',
          muted: '#8a6e20',
        },
      },
      fontFamily: {
        khmer: ['"Noto Sans Khmer"', '"Hanuman"', 'sans-serif'],
        sans: ['"Noto Sans Khmer"', '"Inter"', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
