'use client'

import { Button } from '@/components/ui/button'

export function OnboardingOverlay({
  title,
  description,
  step,
  onNext,
  onSkip,
  action,
}: {
  title: string
  description: string
  step: 1 | 2 | 3
  onNext: () => void
  onSkip: () => void
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="fixed inset-0 z-[95] bg-black/55 p-4">
      <div className="mx-auto mt-16 w-full max-w-xl rounded-2xl border border-[rgba(167,139,250,0.25)] bg-[rgba(10,8,22,0.98)] p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">Onboarding • Step {step}/3</p>
          <button className="text-xs text-[rgba(241,240,255,0.55)] hover:text-white" onClick={onSkip}>Skip</button>
        </div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-[rgba(241,240,255,0.72)]">{description}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((dot) => (
              <span
                key={dot}
                className={`h-2.5 w-2.5 rounded-full ${dot === step ? 'bg-primary' : 'bg-[rgba(241,240,255,0.20)]'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {action && (
              <Button variant="outline" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            <Button onClick={onNext}>{step === 3 ? 'Finish' : 'Next'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
