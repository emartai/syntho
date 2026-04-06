'use client';

export function SocialProofBar() {
  const companies = ['Flutterwave', 'Paystack', 'Kuda', 'Moniepoint'];

  return (
    <section className="py-12 border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <span className="text-white/30 text-sm whitespace-nowrap">Trusted by teams at</span>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-6 animate-marquee">
              {[...companies, ...companies].map((company, i) => (
                <span key={i} className="text-white/35 font-medium text-sm whitespace-nowrap">
                  {company}
                  {i < companies.length * 2 - 1 && <span className="mx-6 text-white/10">·</span>}
                </span>
              ))}
            </div>
          </div>
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
