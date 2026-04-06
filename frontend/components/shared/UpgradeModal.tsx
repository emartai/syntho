'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UpgradeModal({
  open,
  onClose,
  reason,
}: {
  open: boolean
  onClose: () => void
  reason?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-2xl border-[rgba(167,139,250,0.25)] bg-[rgba(10,8,22,0.98)]">
        <CardHeader>
          <CardTitle>Upgrade to unlock this feature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[rgba(241,240,255,0.72)]">
            {reason || 'You’ve reached a limit on the free plan.'}
          </p>

          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <PlanCol title="Free" points={["10 jobs/month", "10k rows", "No API keys"]} />
            <PlanCol title="Pro" points={["Unlimited jobs", "500k rows", "CTGAN + API keys"]} highlighted />
            <PlanCol title="Growth" points={["Everything in Pro", "Priority GPU", "Brandable PDF"]} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Maybe later</Button>
            <Button asChild>
              <Link href="/settings/billing" onClick={onClose}>Upgrade to Pro</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PlanCol({ title, points, highlighted }: { title: string; points: string[]; highlighted?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlighted ? 'border-primary bg-primary/10' : 'border-[rgba(167,139,250,0.15)]'}`}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 space-y-1 text-[rgba(241,240,255,0.70)]">
        {points.map((p) => <li key={p}>• {p}</li>)}
      </ul>
    </div>
  )
}
