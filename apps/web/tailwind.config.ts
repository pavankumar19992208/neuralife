import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E40AF',
          light: '#DBEAFE',
          dark: '#1E3A8A',
        },
        secondary: {
          DEFAULT: '#0D9488',
          light: '#CCFBF1',
          dark: '#0F766E',
        },
        accent: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#f1f5f9',
        },
        background: '#F8FAFC',
        border: '#E2E8F0',
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#94a3b8',
          inverse: '#ffffff',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#0f172a',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        input: '#e2e8f0',
        ring: '#1e40af',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        telugu: ['Noto Sans Telugu', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        md: '0 4px 6px rgba(0,0,0,0.07)',
      },
    },
  },
  plugins: [],
} satisfies Config
