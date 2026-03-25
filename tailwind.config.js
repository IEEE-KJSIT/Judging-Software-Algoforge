/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0F',
        surface: '#111118',
        'surface-raised': '#1A1A24',
        divider: '#2A2A38',
        primary: '#6C63FF',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        'text-primary': '#F0F0FF',
        'text-secondary': '#8888AA',
        'text-muted': '#44445A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.5' }],
        xs: ['13px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.6' }],
        md: ['17px', { lineHeight: '1.4' }],
        lg: ['22px', { lineHeight: '1.3' }],
        xl: ['28px', { lineHeight: '1.2' }],
        '2xl': ['36px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        pill: '999px',
        input: '8px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(108, 99, 255, 0.3)',
        'glow-sm': '0 0 10px rgba(108, 99, 255, 0.2)',
        card: '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
};
