'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image src="/hero-helix.png" alt="" fill priority className="object-cover object-center opacity-35" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #05030f 70%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, #05030f10 0%, #05030fB3 60%, #05030f 100%)' }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-16">
        <h1 className="font-display font-bold leading-tight mb-6 text-5xl md:text-7xl lg:text-8xl">
          <span
            style={{
              background: 'linear-gradient(90deg, #6366f1, #22d3ee, #6366f1)',
              backgroundSize: '200%',
              animation: 'gradient-shift 3s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Generate Safe Synthetic Data. Stay Compliant.
          </span>
        </h1>

        <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Upload your real dataset and get a statistically similar synthetic version with privacy scoring,
          trust scoring, and GDPR/HIPAA-ready reports in minutes.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
          <Link
            href="/login"
            className="px-8 py-4 text-base font-semibold text-white rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:scale-105 hover:brightness-110 transition-all"
            style={{ boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)' }}
          >
            Start Free
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 text-base font-medium text-white/80 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 transition-all"
          >
            See How It Works
          </a>
        </div>
      </div>

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
