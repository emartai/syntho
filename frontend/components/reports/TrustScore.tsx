'use client';

interface TrustScoreProps {
  composite_score: number;
  privacy_score: number;
  fidelity_score: number;
  compliance_score: number;
  label: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

export function TrustScore({
  composite_score,
  privacy_score,
  fidelity_score,
  compliance_score,
  label,
}: TrustScoreProps) {
  const score = Math.max(0, Math.min(100, composite_score || 0));
  const angle = (score / 100) * 270;

  return (
    <div
      className="grid gap-4 md:grid-cols-[220px_1fr]"
      aria-label={`Composite trust score ${Math.round(score)} out of 100, rated ${label}`}
    >
      <div className="flex items-center justify-center rounded-2xl border border-[rgba(167,139,250,0.18)] bg-[rgba(167,139,250,0.08)] p-6">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <path
            d={describeArc(90, 90, 64, 135, 405)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={describeArc(90, 90, 64, 135, 135 + angle)}
            stroke="url(#trust-gradient)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            style={{ transition: 'all 600ms ease' }}
          />
          <defs>
            <linearGradient id="trust-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <text x="90" y="82" textAnchor="middle" className="fill-text text-[38px] font-bold">
            {Math.round(score)}
          </text>
          <text x="90" y="104" textAnchor="middle" className="fill-[rgba(241,240,255,0.55)] text-[12px]">
            {label}
          </text>
        </svg>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[rgba(167,139,250,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[rgba(241,240,255,0.45)]">Privacy</p>
          <p className="mt-1 text-lg font-semibold text-text">{Math.round(privacy_score || 0)}</p>
        </div>
        <div className="rounded-xl border border-[rgba(167,139,250,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[rgba(241,240,255,0.45)]">Fidelity</p>
          <p className="mt-1 text-lg font-semibold text-text">{Math.round(fidelity_score || 0)}</p>
        </div>
        <div className="rounded-xl border border-[rgba(167,139,250,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[rgba(241,240,255,0.45)]">Compliance</p>
          <p className="mt-1 text-lg font-semibold text-text">{Math.round(compliance_score || 0)}</p>
        </div>
      </div>
    </div>
  );
}
