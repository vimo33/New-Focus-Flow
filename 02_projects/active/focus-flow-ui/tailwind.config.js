/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#06080F',
        surface: '#0C1220',
        elevated: '#141E30',
        primary: '#00E5FF',
        secondary: '#FFB800',
        tertiary: '#8B5CF6',
        success: '#22C55E',
        danger: '#EF4444',
        'muted-teal': '#3BBFB2',
        'text-primary': '#E8ECF1',
        'text-secondary': '#7B8FA3',
        'text-tertiary': '#4A5568',
        // Legacy compatibility
        'background-dark': '#06080F',
        'surface-dark': '#0C1220',
        'card-dark': '#141E30',
      },
      fontFamily: {
        display: ['Syncopate', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'base': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}
