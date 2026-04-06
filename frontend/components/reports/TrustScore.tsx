'use client'

import { useEffect, useMemo, useState } from 'react'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'

interface TrustScoreProps {
  composite_score: number
  privacy_score: number
  fidelity_score: number
  compliance_score: number
  label: string
}

function scoreColor(score: number) {
  if (score >= 75) return '#22c55e'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function TrustScore({
  composite_score,
  privacy_score,
  fidelity_score,
  compliance_score,
  label,
}: TrustScoreProps) {
  const safeScore = Number.isFinite(composite_score) ? Math.max(0, Math.min(100, composite_score)) : 0
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(safeScore), 60)
    return () => clearTimeout(t)
  }, [safeScore])

  const data = useMemo(() => [{ name: 'Trust', value: animatedScore, fill: scoreColor(safeScore) }], [animatedScore, safeScore])

  return (
    <div
      className="rounded-2xl border border-[rgba(167,139,250,0.20)] bg-[rgba(15,15,28,0.85)] p-6"
      aria-label={`Composite trust score ${safeScore} out of 100. ${label}. Privacy ${privacy_score}, fidelity ${fidelity_score}, compliance ${compliance_score}.`}
    >
      <div className="mx-auto h-[220px] w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={18}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background clockWise dataKey="value" cornerRadius={10} isAnimationActive animationDuration={650} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="-mt-32 text-center">
          <p className="text-5xl font-bold text-white">{Math.round(safeScore)}</p>
          <p className="mt-2 text-sm text-[rgba(241,240,255,0.70)]">{label}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-center text-sm sm:grid-cols-3">
        <p>
          Privacy <span className="font-semibold text-primary">{Math.round(privacy_score || 0)}</span>
        </p>
        <p>
          Fidelity <span className="font-semibold text-cyan-400">{Math.round(fidelity_score || 0)}</span>
        </p>
        <p>
          Compliance <span className="font-semibold text-emerald-400">{Math.round(compliance_score || 0)}</span>
        </p>
      </div>
    </div>
  )
}
