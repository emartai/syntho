'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0 z-0">
        {/* Layer 1: Hero Image */}
        <Image
          src="/hero-helix.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-35"
        />
        {/* Layer 2: Radial Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, #05030f 70%)',
          }}
        />
        {/* Layer 3: Linear Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, #05030f/10 0%, #05030f/70 60%, #05030f 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-16">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 border border-[#6366f1]/40 bg-[#6366f1]/10 text-[#a5b4fc] rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-sm mb-8">
          <span>✦</span>
          <span>Synthetic Data — GDPR & HIPAA Ready</span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-bold leading-tight mb-6">
          <span className="block text-white text-5xl md:text-7xl lg:text-8xl">
            Your Data Has a
          </span>
          <span
            className="block text-5xl md:text-7xl lg:text-8xl mt-2"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #22d3ee, #6366f1)',
              backgroundSize: '200%',
              animation: 'gradient-shift 3s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Safer Twin.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Upload your real dataset. Get a statistically identical synthetic version
          with a privacy score, GDPR compliance report, and zero re-identification risk.
          In minutes.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
          <Link
            href="/login"
            className="px-8 py-4 text-base font-semibold text-white rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:scale-105 hover:brightness-110 transition-all"
            style={{ boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)' }}
          >
            Generate Free Dataset →
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 text-base font-medium text-white/80 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 transition-all"
          >
            See How It Works
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 opacity-40 animate-bounce">
        <ChevronDown size={32} className="text-white" />
      </div>

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </section>
  );
}
