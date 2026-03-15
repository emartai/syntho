'use client';

export function SocialProofBar() {
  const companies = [
    'Fintech Corp',
    'HealthData Labs',
    'RetailAI',
    'LogisticsPro',
    'BankTech NG',
    'InsureBase',
  ];

  const stats = [
    '10,000+ Datasets Generated',
    '99.2% Privacy Score Average',
    'GDPR & HIPAA Compliant',
  ];

  return (
    <section className="py-12 border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Label + Logo Strip */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <span className="text-white/30 text-sm whitespace-nowrap">
            Trusted by data teams at
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-6 animate-marquee">
              {[...companies, ...companies].map((company, i) => (
                <span
                  key={i}
                  className="text-white/20 font-medium text-sm whitespace-nowrap"
                >
                  {company}
                  {i < companies.length * 2 - 1 && (
                    <span className="mx-6 text-white/10">·</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {stats.map((stat) => (
            <div
              key={stat}
              className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-white/50 text-xs"
            >
              {stat}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
