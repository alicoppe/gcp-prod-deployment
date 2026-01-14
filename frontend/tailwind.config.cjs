/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
        display: ['"Fraunces"', 'ui-serif', 'Georgia']
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        drift: {
          '0%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(8px, -12px)' },
          '100%': { transform: 'translate(0, 0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out both',
        drift: 'drift 12s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
