import { Upload, ScanLine, Cpu, BarChart3, Download } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: Upload,
      color: '#6366f1',
      title: 'Upload',
      body: 'Upload CSV, JSON, Parquet, or XLSX from your local machine.',
    },
    {
      number: '02',
      icon: ScanLine,
      color: '#22d3ee',
      title: 'Detect Schema',
      body: 'Syntho auto-detects columns, types, null percentages, and sample values.',
    },
    {
      number: '03',
      icon: Cpu,
      color: '#a78bfa',
      title: 'Generate',
      body: 'Choose Gaussian Copula or CTGAN and generate synthetic rows safely.',
    },
    {
      number: '04',
      icon: BarChart3,
      color: '#34d399',
      title: 'Score',
      body: 'Review privacy, fidelity, and composite trust score before release.',
    },
    {
      number: '05',
      icon: Download,
      color: '#f59e0b',
      title: 'Download PDF',
      body: 'Download synthetic data and compliance PDF for audits and stakeholders.',
    },
  ];

  return (
    <section id="how-it-works" className="py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-[#6366f1] text-xs font-semibold tracking-[0.3em] uppercase mb-4">PROCESS</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
            From real data to safe data in 5 steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="relative rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all hover:border-white/20"
              >
                <div className="absolute top-6 left-6 font-display text-5xl text-white/5 font-bold">{step.number}</div>
                <div className="relative mb-4">
                  <Icon size={32} style={{ color: step.color }} />
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
