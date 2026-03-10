# Syntho — Design System
## Plasma Aurora UI + Data Helix Logo — Full Specification
## Reference this alongside context.md in all frontend prompts

---

## 🌌 Design Philosophy

**Plasma Aurora** is built on deep-space scientific visualization. The aesthetic communicates that Syntho's synthetic data is sophisticated, trustworthy, and alive. Three core tensions drive every decision:

1. **Depth vs. Flatness** — Aurora glows create infinite depth; card content stays crisp and flat
2. **Dark vs. Vivid** — Near-black backgrounds make violet and cyan explode with contrast
3. **Organic vs. Precise** — Flowing aurora blobs vs. exact data tables and sharp numbers

---

## 🎨 Complete Color System

### CSS Variables (add to app/globals.css)
```css
:root {
  --bg:             #05030f;
  --bg-2:           #09060f;
  --bg-elevated:    #0e0a1a;
  --surface:        rgba(255, 255, 255, 0.04);
  --surface-2:      rgba(255, 255, 255, 0.07);
  --surface-3:      rgba(255, 255, 255, 0.11);
  --border:         rgba(167, 139, 250, 0.10);
  --border-2:       rgba(167, 139, 250, 0.22);
  --border-3:       rgba(167, 139, 250, 0.40);
  --primary:        #a78bfa;
  --primary-dark:   #7c3aed;
  --primary-light:  #c4b5fd;
  --primary-dim:    rgba(167, 139, 250, 0.12);
  --primary-glow:   rgba(167, 139, 250, 0.25);
  --accent:         #06b6d4;
  --accent-dark:    #0891b2;
  --accent-light:   #67e8f9;
  --accent-dim:     rgba(6, 182, 212, 0.10);
  --accent-glow:    rgba(6, 182, 212, 0.20);
  --aurora-1:       rgba(124, 58, 237, 0.22);
  --aurora-2:       rgba(6, 182, 212, 0.14);
  --aurora-3:       rgba(167, 139, 250, 0.10);
  --text:           #f1f0ff;
  --text-2:         rgba(241, 240, 255, 0.65);
  --text-3:         rgba(241, 240, 255, 0.38);
  --text-4:         rgba(241, 240, 255, 0.20);
  --success:        #22c55e;
  --success-dim:    rgba(34, 197, 94, 0.12);
  --warning:        #f59e0b;
  --warning-dim:    rgba(245, 158, 11, 0.12);
  --danger:         #ef4444;
  --danger-dim:     rgba(239, 68, 68, 0.12);
  --gradient-primary: linear-gradient(135deg, #a78bfa, #06b6d4);
  --gradient-text:    linear-gradient(135deg, #c4b5fd, #67e8f9);
  --shadow-glow:    0 0 20px rgba(167, 139, 250, 0.25);
  --shadow-glow-accent: 0 0 20px rgba(6, 182, 212, 0.20);
}
```

### Tailwind Config
```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        body:    ['Satoshi', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'aurora-1':    'aurora1 20s ease-in-out infinite alternate',
        'aurora-2':    'aurora2 25s ease-in-out infinite alternate',
        'aurora-3':    'aurora3 18s ease-in-out infinite alternate',
        'fade-up':     'fadeUp 0.5s ease forwards',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s linear infinite',
      },
      keyframes: {
        aurora1:    { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(5%,8%) scale(1.1)' } },
        aurora2:    { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(-8%,5%) scale(0.95)' } },
        aurora3:    { '0%': { transform: 'translate(0,0) scale(1)' }, '100%': { transform: 'translate(6%,-6%) scale(1.05)' } },
        fadeUp:     { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow:  { '0%,100%': { boxShadow: '0 0 10px var(--primary-glow)' }, '50%': { boxShadow: '0 0 28px var(--primary-glow)' } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
}
```

---

## 🧬 Logo — Data Helix (Full Implementation)

The Data Helix logo renders two interweaving ribbon strands (violet + cyan) with cross-link connectors, like a DNA helix made of data streams.

```tsx
// components/logo/Logo.tsx
'use client';

export function Logo({ size = 32, showText = true, className }: { size?: number; showText?: boolean; className?: string }) {
  const s = size;
  const c = s / 2;
  const strand1: string[] = [];
  const strand2: string[] = [];
  const crossLinks: { x1: number; y1: number; x2: number }[] = [];

  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x1 = c + Math.sin(t * Math.PI * 2.5) * s * 0.30;
    const y1 = s * 0.05 + t * s * 0.90;
    strand1.push(`${i === 0 ? 'M' : 'L'} ${x1.toFixed(2)} ${y1.toFixed(2)}`);
    const x2 = c + Math.sin(t * Math.PI * 2.5 + Math.PI) * s * 0.30;
    strand2.push(`${i === 0 ? 'M' : 'L'} ${x2.toFixed(2)} ${y1.toFixed(2)}`);
    if (i % 4 === 0) crossLinks.push({ x1, y1, x2 });
  }

  return (
    <div className={`flex items-center gap-3 ${className || ''}`}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
        <defs>
          <linearGradient id={`hg1-${s}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id={`hg2-${s}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id={`hglow-${s}`}>
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {crossLinks.map((cl, i) => (
          <line key={i} x1={cl.x1} y1={cl.y1} x2={cl.x2} y2={cl.y1}
            stroke="rgba(167,139,250,0.22)" strokeWidth={s * 0.022} />
        ))}
        <path d={strand1.join(' ')} stroke={`url(#hg1-${s})`}
          strokeWidth={s * 0.062} strokeLinecap="round" strokeLinejoin="round"
          filter={`url(#hglow-${s})`} />
        <path d={strand2.join(' ')} stroke={`url(#hg2-${s})`}
          strokeWidth={s * 0.062} strokeLinecap="round" strokeLinejoin="round"
          opacity="0.72" filter={`url(#hglow-${s})`} />
      </svg>
      {showText && size >= 20 && (
        <span style={{
          fontFamily: 'Clash Display, sans-serif', fontWeight: 700,
          fontSize: size * 0.55, letterSpacing: '-0.02em', lineHeight: 1,
          background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Syntho</span>
      )}
    </div>
  );
}
```

### Logo Size Guide
| Context | size prop | showText |
|---------|-----------|----------|
| Favicon | 32 | false |
| Sidebar icon | 28 | false |
| Navbar / sidebar with text | 28 | true |
| Login page | 48 | true |
| Landing hero | 64 | true |
| OG image | 80 | true |

---

## 🌠 Aurora Background

```tsx
// components/layout/AuroraBackground.tsx
export function AuroraBackground() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div className="animate-aurora-1" style={{ position: 'absolute', top: '-20%', left: '20%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      <div className="animate-aurora-2" style={{ position: 'absolute', top: '15%', right: '-15%', width: '50%', height: '55%', background: 'radial-gradient(ellipse, rgba(6,182,212,0.14) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)' }} />
      <div className="animate-aurora-3" style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '45%', height: '50%', background: 'radial-gradient(ellipse, rgba(167,139,250,0.10) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, opacity: 0.025, mixBlendMode: 'overlay' as const }} />
    </div>
  );
}
```

---

## 🪟 Shared Components

### GlassCard
```tsx
// components/shared/GlassCard.tsx
import { cn } from '@/lib/utils';
export function GlassCard({ children, className, glow, hover, onClick }: { children: React.ReactNode; className?: string; glow?: boolean; hover?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('relative rounded-[14px] p-5 transition-all duration-200 border border-[rgba(167,139,250,0.10)]', hover && 'cursor-pointer hover:border-[rgba(167,139,250,0.22)] hover:bg-[rgba(255,255,255,0.07)]', glow && 'shadow-[0_0_20px_rgba(167,139,250,0.15)]', className)}
      style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      {children}
    </div>
  );
}
```

### AuroraBadge
```tsx
// components/shared/AuroraBadge.tsx
type V = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';
const S: Record<V, [string,string,string]> = {
  primary: ['rgba(167,139,250,0.12)','#a78bfa','rgba(167,139,250,0.25)'],
  accent:  ['rgba(6,182,212,0.10)',  '#06b6d4','rgba(6,182,212,0.25)'],
  success: ['rgba(34,197,94,0.10)',  '#22c55e','rgba(34,197,94,0.25)'],
  warning: ['rgba(245,158,11,0.10)', '#f59e0b','rgba(245,158,11,0.25)'],
  danger:  ['rgba(239,68,68,0.10)',  '#ef4444','rgba(239,68,68,0.25)'],
  muted:   ['rgba(241,240,255,0.06)','rgba(241,240,255,0.4)','rgba(241,240,255,0.1)'],
};
export function AuroraBadge({ children, variant = 'primary' }: { children: React.ReactNode; variant?: V }) {
  const [bg, color, border] = S[variant];
  return <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'Satoshi, sans-serif', display: 'inline-block' }}>{children}</span>;
}
```

---

## 📄 Page Visual Specs

### Landing Page
- Full-screen hero, aurora active, navbar with blur bg
- Headline: 3-line Clash Display 64px — "Generate" (text-2) / "Synthetic Data" (gradient text) / "That Feels Real" (text)
- Two CTA buttons: gradient "Start Building Free" + ghost "View Marketplace →"
- 4 feature GlassCards in 2x2 grid, hover glow
- Stats bar: bg-elevated, 3 large numbers

### Auth Pages (Login/Signup)
- Split: left aurora hero + right login card
- OAuth buttons only (Google + GitHub) — no email/password
- GlassCard login form, 400px centered

### Dashboard Layout
- AuroraBackground fixed z-0
- Sidebar 64px: blur bg, icon nav, primary active state with left border glow
- Navbar: blur bg, page title left, search + bell + avatar right

### Dashboard Overview
- 4 stat cards (GlassCard) — large number, label, trend
- Dataset table (GlassCard) — AuroraBadge status columns
- Privacy distribution BarChart — gradient bars
- Compliance progress bars — gradient fill

### Upload Page
- Large dropzone: dashed border, drag-over = primary glow
- After upload: schema preview table with type badges
- Progress bar: shimmer animation while uploading

### Generate Page
- Method selector: 2 large radio cards with glow on selected
- JobProgress: vertical step list, animated pulse on active step
- Progress bar: shimmer gradient

### Dataset Detail (Tabs)
- Overview | Privacy Score | Quality Report | Compliance | Download
- Privacy gauge: RadialBarChart, score center, color by risk
- Quality: DistributionChart per column (primary=original, accent=synthetic)
- Compliance: pass/fail banner + checklist

### Marketplace
- 3-col grid of ListingCards (GlassCard + hover)
- Price: Clash Display, primary color
- Filter sidebar: glass style

### API Keys
- Table of keys with prefix, scopes, usage
- Full key shown once in mono box on creation
- Code examples: Python | JS | cURL in glass code blocks

---

## 🎬 Animation CSS

```css
/* Staggered entrance — add nth-child delays */
.stagger-1 { animation: fadeUp 0.45s ease forwards; animation-delay: 0ms;   opacity: 0; }
.stagger-2 { animation: fadeUp 0.45s ease forwards; animation-delay: 60ms;  opacity: 0; }
.stagger-3 { animation: fadeUp 0.45s ease forwards; animation-delay: 120ms; opacity: 0; }
.stagger-4 { animation: fadeUp 0.45s ease forwards; animation-delay: 180ms; opacity: 0; }

/* Progress shimmer */
.progress-shimmer {
  background: linear-gradient(90deg, #a78bfa 0%, #06b6d4 50%, #a78bfa 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
}

/* Active job dot */
.job-pulse { animation: pulseGlow 1.8s ease-in-out infinite; }
```

---

## 📐 Typography Scale

| Use | Font | Size | Weight | Color var |
|-----|------|------|--------|-----------|
| Hero headline | Clash Display | 56–64px | 700 | gradient-text |
| Page title | Clash Display | 24px | 700 | --text |
| Section title | Clash Display | 18px | 600 | --text |
| Card title | Clash Display | 15px | 600 | --text |
| Body copy | Satoshi | 14px | 400 | --text-2 |
| Small / meta | Satoshi | 12px | 400 | --text-3 |
| Caps label | Satoshi | 10px | 600 | --text-3 (letter-spacing: 2px) |
| Large stat | Clash Display | 28–36px | 700 | --primary |
| Code / keys | JetBrains Mono | 13px | 400 | --accent |
| Badge | Satoshi | 11px | 600 | badge color |

---

## 🔲 Layout & Spacing

```
Sidebar width:       64px
Top navbar height:   64px
Card padding:        20px
Section gap:         24px
Grid gap:            16px
Border radius card:  14px
Border radius btn:   8px
Border radius badge: 20px (pill)
Max content width:   1200px
Page padding:        24px
```

---

## 📱 Responsive Rules

| Breakpoint | Layout |
|------------|--------|
| < 640px | Single column, sidebar hidden, bottom tab bar 5 icons |
| 640–1024px | 2-col grid, sidebar icons only (64px) |
| > 1024px | 3-col grid, full sidebar |

