import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        sans: ['Satoshi', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#05030f',
        'bg-2': '#09060f',
        'bg-elevated': '#0e0a1a',
        surface: 'rgba(255, 255, 255, 0.04)',
        'surface-2': 'rgba(255, 255, 255, 0.07)',
        'surface-3': 'rgba(255, 255, 255, 0.11)',
        border: 'rgba(167, 139, 250, 0.10)',
        'border-2': 'rgba(167, 139, 250, 0.22)',
        'border-3': 'rgba(167, 139, 250, 0.40)',
        primary: '#a78bfa',
        'primary-dark': '#7c3aed',
        'primary-light': '#c4b5fd',
        'primary-dim': 'rgba(167, 139, 250, 0.12)',
        'primary-glow': 'rgba(167, 139, 250, 0.25)',
        accent: '#06b6d4',
        'accent-dark': '#0891b2',
        'accent-light': '#67e8f9',
        'accent-dim': 'rgba(6, 182, 212, 0.10)',
        'accent-glow': 'rgba(6, 182, 212, 0.20)',
        'aurora-1': 'rgba(124, 58, 237, 0.22)',
        'aurora-2': 'rgba(6, 182, 212, 0.14)',
        'aurora-3': 'rgba(167, 139, 250, 0.10)',
        text: '#f1f0ff',
        'text-2': 'rgba(241, 240, 255, 0.65)',
        'text-3': 'rgba(241, 240, 255, 0.38)',
        'text-4': 'rgba(241, 240, 255, 0.20)',
        success: '#22c55e',
        'success-dim': 'rgba(34, 197, 94, 0.12)',
        warning: '#f59e0b',
        'warning-dim': 'rgba(245, 158, 11, 0.12)',
        danger: '#ef4444',
        'danger-dim': 'rgba(239, 68, 68, 0.12)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #a78bfa, #06b6d4)',
        'gradient-text': 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(167, 139, 250, 0.25)',
        'glow-accent': '0 0 20px rgba(6, 182, 212, 0.20)',
      },
      animation: {
        'aurora-1': 'aurora1 20s ease-in-out infinite alternate',
        'aurora-2': 'aurora2 25s ease-in-out infinite alternate',
        'aurora-3': 'aurora3 18s ease-in-out infinite alternate',
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        aurora1: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(5%,8%) scale(1.1)' },
        },
        aurora2: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(-8%,5%) scale(0.95)' },
        },
        aurora3: {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '100%': { transform: 'translate(6%,-6%) scale(1.05)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px var(--primary-glow)' },
          '50%': { boxShadow: '0 0 28px var(--primary-glow)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
