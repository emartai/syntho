import { Shield } from 'lucide-react';

export function PrivacyCompliance() {
  return (
    <section className="py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            <div className="text-[#6366f1] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
              TRUST & COMPLIANCE
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              Built for regulated industries
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              Syntho is purpose-built for healthcare, finance, and logistics teams
              that handle sensitive data. Every synthetic dataset is scored, audited,
              and accompanied by a compliance report that meets GDPR Article 89
              and HIPAA Safe Harbor requirements.
            </p>

            {/* Compliance Badges */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-white/[0.03] border border-[#6366f1]/40">
                <Shield size={20} style={{ color: '#6366f1' }} />
                <span className="text-white/80 text-sm font-medium">
                  GDPR Article 89 Compliant
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-white/[0.03] border border-[#22d3ee]/40">
                <Shield size={20} style={{ color: '#22d3ee' }} />
                <span className="text-white/80 text-sm font-medium">
                  HIPAA Safe Harbor Method
                </span>
              </div>
            </div>
          </div>

          {/* Right: Privacy Score Card */}
          <div className="relative">
            <div
              className="rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm relative z-10"
              style={{
                boxShadow: '0 0 60px rgba(34, 211, 238, 0.1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-white/60 text-sm font-medium">Privacy Score</span>
                <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full px-3 py-1 text-[#22c55e] text-xs font-semibold">
                  LOW RISK
                </div>
              </div>

              {/* Score */}
              <div className="text-center mb-8">
                <div
                  className="font-display text-7xl font-bold inline-block"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  94
                </div>
                <span className="text-white/40 text-2xl font-display">/100</span>
              </div>

              {/* Risk Rows */}
              <div className="space-y-3">
                {[
                  { label: 'Singling Out Risk', status: 'Low' },
                  { label: 'Linkability Risk', status: 'Low' },
                  { label: 'PII Detected', status: 'None' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-white/50">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30">······</span>
                      <span className="text-[#22c55e] font-medium">{item.status}</span>
                      <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-white/5 text-center text-white/40 text-xs uppercase tracking-wider">
                GDPR ✓ HIPAA ✓
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
