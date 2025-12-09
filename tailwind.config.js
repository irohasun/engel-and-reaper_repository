/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tavern: {
          bg: '#1a0f0a',
          wood: '#2c1810',
          'wood-light': '#3d2317',
          leather: '#8b4513',
          gold: '#c9a227',
          'gold-light': '#d4af37',
          parchment: '#f5deb3',
          cream: '#f5f5dc',
          ink: '#1a1a1a',
        },
        player: {
          blue: '#1e3a5f',
          red: '#8b2500',
          yellow: '#b8860b',
          green: '#2e5a3a',
          purple: '#4a2a6a',
          pink: '#8b4567',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        lora: ['Lora', 'serif'],
      },
      backgroundImage: {
        'wood-texture': 'linear-gradient(135deg, #2c1810 0%, #1a0f0a 50%, #2c1810 100%)',
        'parchment-texture': 'linear-gradient(135deg, #f5deb3 0%, #deb887 50%, #f5deb3 100%)',
        'velvet-texture': 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
      },
      boxShadow: {
        'card': '0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 16px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.4)',
        'gold': '0 0 20px rgba(201, 162, 39, 0.4)',
        'inner-gold': 'inset 0 0 20px rgba(201, 162, 39, 0.2)',
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(201, 162, 39, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(201, 162, 39, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
