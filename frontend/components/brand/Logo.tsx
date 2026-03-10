'use client';

export function Logo({
    size = 32,
    showText = true,
    className,
}: {
    size?: number;
    showText?: boolean;
    className?: string;
}) {
    const s = size;
    const c = s / 2;
    const strand1: string[] = [];
    const strand2: string[] = [];
    const crossLinks: { x1: number; y1: number; x2: number }[] = [];

    for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x1 = c + Math.sin(t * Math.PI * 2.5) * s * 0.3;
        const y1 = s * 0.05 + t * s * 0.9;
        strand1.push(`${i === 0 ? 'M' : 'L'} ${x1.toFixed(2)} ${y1.toFixed(2)}`);
        const x2 = c + Math.sin(t * Math.PI * 2.5 + Math.PI) * s * 0.3;
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
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {crossLinks.map((cl, i) => (
                    <line
                        key={i}
                        x1={cl.x1}
                        y1={cl.y1}
                        x2={cl.x2}
                        y2={cl.y1}
                        stroke="rgba(167,139,250,0.22)"
                        strokeWidth={s * 0.022}
                    />
                ))}
                <path
                    d={strand1.join(' ')}
                    stroke={`url(#hg1-${s})`}
                    strokeWidth={s * 0.062}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#hglow-${s})`}
                />
                <path
                    d={strand2.join(' ')}
                    stroke={`url(#hg2-${s})`}
                    strokeWidth={s * 0.062}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.72"
                    filter={`url(#hglow-${s})`}
                />
            </svg>
            {showText && size >= 20 && (
                <span
                    style={{
                        fontFamily: 'Clash Display, sans-serif',
                        fontWeight: 700,
                        fontSize: size * 0.55,
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                        background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Syntho
                </span>
            )}
        </div>
    );
}
