import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import {
    Upload,
    Sparkles,
    ShieldCheck,
    Store,
    ArrowRight,
    Database,
    Lock,
    BarChart3,
    Zap,
} from 'lucide-react';

const features = [
    {
        icon: Upload,
        title: 'Upload',
        description:
            'Drag & drop your CSV, JSON, Parquet, or Excel datasets. Automatic schema detection in seconds.',
        color: '#a78bfa',
        dimColor: 'rgba(167, 139, 250, 0.12)',
    },
    {
        icon: Sparkles,
        title: 'Generate',
        description:
            'Choose CTGAN, Gaussian Copula, or TVAE to synthesize statistically accurate new data.',
        color: '#06b6d4',
        dimColor: 'rgba(6, 182, 212, 0.10)',
    },
    {
        icon: ShieldCheck,
        title: 'Score',
        description:
            'AI-powered privacy risk scoring with PII detection, plus auto-generated GDPR & HIPAA reports.',
        color: '#22c55e',
        dimColor: 'rgba(34, 197, 94, 0.10)',
    },
    {
        icon: Store,
        title: 'Sell',
        description:
            'List privacy-safe synthetic datasets on the marketplace. Earn from every purchase with split payments.',
        color: '#f59e0b',
        dimColor: 'rgba(245, 158, 11, 0.10)',
    },
];

const stats = [
    { value: '99.7%', label: 'Statistical Fidelity', icon: BarChart3 },
    { value: '<0.01%', label: 'Privacy Leakage', icon: Lock },
    { value: '10×', label: 'Faster than Manual', icon: Zap },
];

export default function LandingPage() {
    return (
        <div className="relative min-h-screen">
            {/* ── Navbar ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)]"
                style={{
                    background: 'rgba(5, 3, 15, 0.7)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <div className="mx-auto max-w-content px-6 h-16 flex items-center justify-between">
                    <Logo size={28} showText />
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm font-medium text-text-2 hover:text-text transition-colors font-body"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/login"
                            className="btn-gradient px-5 py-2 text-sm font-semibold rounded-btn inline-flex items-center gap-2"
                        >
                            <span>Get Started</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero Section ── */}
            <section className="relative pt-40 pb-24 px-6">
                <div className="mx-auto max-w-content text-center">
                    {/* Badge */}
                    <div className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-badge border border-[var(--border-2)] mb-8"
                        style={{ background: 'var(--primary-dim)' }}
                    >
                        <Database className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold tracking-wide text-primary-light font-body">
                            SYNTHETIC DATA PLATFORM
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="stagger-2 font-display font-bold leading-[1.08] tracking-tight mb-6"
                        style={{ fontSize: 'clamp(40px, 6vw, 64px)' }}
                    >
                        <span className="text-text-2 block">Generate</span>
                        <span className="animate-gradient-text block">Synthetic Data</span>
                        <span className="text-text block">That Feels Real</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="stagger-3 text-text-2 text-lg max-w-xl mx-auto mb-10 font-body leading-relaxed">
                        Upload your datasets, generate privacy-safe synthetic versions with
                        ML, get compliance reports, and sell on the marketplace — all in one
                        platform.
                    </p>

                    {/* CTA Buttons */}
                    <div className="stagger-4 flex items-center justify-center gap-4 flex-wrap">
                        <Link
                            href="/login"
                            id="cta-get-started"
                            className="btn-gradient px-8 py-3.5 text-base font-semibold rounded-btn inline-flex items-center gap-2 shadow-glow hover:shadow-[0_0_32px_rgba(167,139,250,0.35)] transition-shadow"
                        >
                            <span>Get Started</span>
                            <ArrowRight className="w-4 h-4 relative z-10" />
                        </Link>
                        <Link
                            href="/marketplace"
                            id="cta-marketplace"
                            className="px-8 py-3.5 text-base font-semibold rounded-btn border border-[var(--border-2)] text-text-2 hover:text-text hover:border-[var(--border-3)] hover:bg-surface-2 transition-all inline-flex items-center gap-2"
                        >
                            View Marketplace
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Hero glow effect */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 60%)',
                        filter: 'blur(80px)',
                    }}
                />
            </section>

            {/* ── Feature Cards ── */}
            <section className="relative px-6 pb-24">
                <div className="mx-auto max-w-content">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {features.map((feature, index) => (
                            <div
                                key={feature.title}
                                className={`stagger-${index + 1} group relative rounded-card p-6 border border-[var(--border)] hover:border-[var(--border-2)] transition-all duration-300 cursor-default`}
                                style={{
                                    background: 'var(--surface)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                }}
                            >
                                {/* Hover glow */}
                                <div
                                    className="absolute inset-0 rounded-card opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(ellipse at 50% 0%, ${feature.dimColor} 0%, transparent 60%)`,
                                    }}
                                />

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                                        style={{
                                            background: feature.dimColor,
                                            border: `1px solid ${feature.color}22`,
                                        }}
                                    >
                                        <feature.icon
                                            className="w-5 h-5"
                                            style={{ color: feature.color }}
                                        />
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-display font-semibold text-[15px] text-text mb-2">
                                        {feature.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-text-2 text-sm font-body leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Stats Bar ── */}
            <section
                className="relative border-t border-b border-[var(--border)]"
                style={{ background: 'var(--bg-elevated)' }}
            >
                <div className="mx-auto max-w-content px-6 py-16">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {stats.map((stat, index) => (
                            <div
                                key={stat.label}
                                className={`stagger-${index + 1} text-center`}
                            >
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <stat.icon className="w-5 h-5 text-primary" />
                                    <span className="font-display font-bold text-3xl text-primary">
                                        {stat.value}
                                    </span>
                                </div>
                                <p className="text-text-3 text-sm font-body">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-[var(--border)]">
                <div className="mx-auto max-w-content px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Logo size={22} showText />
                    <p className="text-text-3 text-xs font-body">
                        © {new Date().getFullYear()} Syntho. Generate safe synthetic data at
                        scale.
                    </p>
                </div>
            </footer>
        </div>
    );
}
