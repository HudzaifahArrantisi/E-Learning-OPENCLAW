/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lp: {
          bg: '#FFFFFF',
          surface: '#F1F5F9',
          card: '#FFFFFF',
          elevated: '#F8FAFC',
          border: 'rgba(0,0,0,0.08)',
          borderA: 'rgba(75,115,255,0.3)',
          accent: '#4B73FF',
          accentS: 'rgba(75,115,255,0.1)',
          atext: '#3B5EEB',
          text: '#0F172A',
          text2: '#475569',
          text3: '#94A3B8',
          green: '#16A34A',
          amber: '#D97706',
          red: '#DC2626',
          tg: '#26A5E4',
        }
      },
      fontFamily: {
        sans: ['Cabin', 'Google Sans', 'Quicksand', 'ui-sans-serif', 'system-ui'],
        instagram: ['Quicksand', 'Cabin', 'system-ui'],
        logo: ['Google Sans', 'Cabin', 'system-ui'],
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },

      aspectRatio: {
        '4/5': '4 / 5',
        '9/16': '9 / 16',
      },

      maxHeight: {
        400: '400px',
        450: '450px',
        500: '500px',
        600: '600px',
        700: '700px',
        800: '800px',
        '90vh': '90vh',
      },

      animation: {
        fadeIn: 'fadeIn .3s ease-out',
        slideUp: 'slideUp .3s ease-out',
        slideInRight: 'slideInRight .3s ease-out',
        scaleIn: 'scaleIn .2s ease-out',
        heartBeat: 'heartBeat 1s ease-out',
        scanAnim: 'scanAnim 18s linear infinite',
        pulse: 'pulse .8s ease-in-out infinite alternate',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        heartBeat: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '15%': { transform: 'scale(1.2)', opacity: '1' },
          '30%': { transform: 'scale(0.95)' },
          '45%, 80%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        scanAnim: {
          '0%': { top: '-160px' },
          '100%': { top: '100%' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.35' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }
    },
  },
  plugins: [],
};
