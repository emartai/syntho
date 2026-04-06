'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function FinalCTA() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    router.push(`/login${query}`);
  };

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <div
          className="w-[800px] h-[800px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h2 className="font-display text-5xl md:text-6xl font-bold mb-4">
          <span className="block text-white">Start generating in 5 minutes</span>
        </h2>

        <p className="text-white/50 text-lg mt-4 mb-10">
          Enter your email to continue to login and create your first synthetic dataset.
        </p>

        <form onSubmit={onSubmit} className="mx-auto max-w-xl flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-4 text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]"
            required
          />
          <button
            type="submit"
            className="px-8 py-4 text-base font-semibold text-white rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:brightness-110 transition-all"
          >
            Continue
          </button>
        </form>
      </div>
    </section>
  );
}
