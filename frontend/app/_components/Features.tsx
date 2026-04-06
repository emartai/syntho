import { Zap, Shield, FileText, Activity, BarChart2, Lock } from 'lucide-react';

export function Features() {
  return (
    <section id="features" className="py-32 bg-gradient-to-b from-transparent via-[#6366f1]/[0.03] to-transparent">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-[#6366f1] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
            CAPABILITIES
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
            Everything your team needs to work with data safely
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Large Card - GPU Accelerated */}
          <div
            className="lg:row-span-2 rounded-3xl p-8 border border-[#6366f1]/30 relative overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom right, rgba(99, 102, 241, 0.2), rgba(34, 211, 238, 0.1))',
            }}
          >
            {/* Aurora Blob */}
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30"
              style={{
                background: 'radial-gradient(circle, #6366f1, transparent)',
              }}
            />

            <div className="relative z-10">
              <Zap size={32} style={{ color: '#22d3ee' }} className="mb-4" />
              <h3 className="font-display text-2xl font-bold text-white mb-3">
                GPU-Accelerated Generation
              </h3>
              <p className="text-white/70 leading-relaxed mb-6">
                Two industry-standard methods. CTGAN for complex tabular data — GPU-accelerated on Modal.com T4.
                Gaussian Copula for fast, reliable output — runs on CPU, no GPU needed.
                Both deliver statistically faithful synthetic data in minutes.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-3">
                {['~3 min avg', '500k rows max', '2 methods'].map((stat) => (
                  <div
                    key={stat}
                    className="bg-white/5 rounded-full px-3 py-1 text-xs text-white/60"
                  >
                    {stat}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Small Card 1 - Privacy Scoring */}
          <div className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <Shield size={28} style={{ color: '#a78bfa' }} className="mb-4" />
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              Privacy Score 0–100
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Presidio-powered PII detection across 10 entity types.
              Singling-out, linkability, and inference risk analysis.
            </p>
          </div>

          {/* Small Card 2 - Compliance Reports */}
          <div className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <FileText size={28} style={{ color: '#34d399' }} className="mb-4" />
            <h3 className="font-display text-xl font-semibold text-white mb-2">
              GDPR & HIPAA PDF Reports
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Auto-generated compliance documentation.
              Ready to share with legal, regulators, and clients.
            </p>
          </div>
        </div>

        {/* Bottom Row - 3 Equal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <Activity size={28} style={{ color: '#6366f1' }} className="mb-4" />
            <h3 className="font-display text-lg font-semibold text-white mb-2">
              Real-Time Progress
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Watch your generation job progress live with WebSocket updates.
            </p>
          </div>

          <div className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <BarChart2 size={28} style={{ color: '#22d3ee' }} className="mb-4" />
            <h3 className="font-display text-lg font-semibold text-white mb-2">
              Statistical Fidelity
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Correlation and distribution validation ensures synthetic data mirrors real data.
            </p>
          </div>

          <div className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <Lock size={28} style={{ color: '#a78bfa' }} className="mb-4" />
            <h3 className="font-display text-lg font-semibold text-white mb-2">
              Secure by Default
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Encrypted storage, per-user access policies. Your data never leaves your control.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
