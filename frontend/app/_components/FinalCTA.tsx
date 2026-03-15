import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Aurora Blob Background */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden
      >
        <div
          className="w-[800px] h-[800px] rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h2 className="font-display text-5xl md:text-6xl font-bold mb-4">
          <span className="block text-white">Your data deserves</span>
          <span
            className="block mt-2"
            style={{
              background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            a safer twin.
          </span>
        </h2>

        <p className="text-white/50 text-lg mt-4 mb-10">
          Generate your first synthetic dataset free. No credit card required.
        </p>

        <Link
          href="/login"
          className="inline-block px-10 py-5 text-lg font-semibold text-white rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] hover:scale-105 hover:brightness-110 transition-all"
          style={{ boxShadow: '0 0 50px rgba(99, 102, 241, 0.4)' }}
        >
          Generate Free Dataset →
        </Link>
      </div>
    </section>
  );
}
