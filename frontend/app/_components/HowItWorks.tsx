import { Upload, Cpu, ShieldCheck, Download } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: Upload,
      color: '#6366f1',
      title: 'Upload Your Dataset',
      body: 'CSV, JSON, Parquet or XLSX. Up to 500,000 rows. Schema is auto-detected instantly.',
    },
    {
      number: '02',
      icon: Cpu,
      color: '#22d3ee',
      title: 'Choose Your Method',
      body: 'CTGAN, TVAE, or Gaussian Copula. GPU-accelerated generation in minutes, not hours.',
    },
    {
      number: '03',
      icon: ShieldCheck,
      color: '#a78bfa',
      title: 'Get Your Privacy Score',
      body: 'PII detection, singling-out risk, linkability risk. Scored 0–100. Risk level: Low / Medium / High / Critical.',
    },
    {
      number: '04',
      icon: Download,
      color: '#34d399',
      title: 'Download + Comply',
      body: 'Your synthetic dataset + a GDPR & HIPAA compliance PDF report, ready to share with regulators.',
    },
  ];

  return (
    <section id="how-it-works" className="py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-[#6366f1] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
            PROCESS
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
            From real data to safe data in 4 steps
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting Line (desktop only) */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-px border-t border-dashed border-[#6366f1]/20" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="relative rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all hover:border-white/20"
              >
                {/* Step Number Background */}
                <div className="absolute top-6 left-6 font-display text-5xl text-white/5 font-bold">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="relative mb-4">
                  <Icon size={32} style={{ color: step.color }} />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
