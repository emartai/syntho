'use client'

import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'

const DISMISS_KEY = 'syntho-onboarding-dismissed'
const STEP_KEY = 'syntho-onboarding-step'

export function useOnboarding() {
  const { profile } = useAuth()
  const [step, setStep] = useState<number>(1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = Number(localStorage.getItem(STEP_KEY) || 1)
    if (Number.isFinite(stored) && stored >= 1 && stored <= 3) setStep(stored)
    setReady(true)
  }, [])

  const eligible = useMemo(() => {
    if (!profile) return false
    const jobsUsed = profile.jobs_used_this_month ?? 0
    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : 0
    const within24h = createdAt > 0 && Date.now() - createdAt < 24 * 60 * 60 * 1000
    const dismissed = typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === 'true'
    return jobsUsed === 0 && within24h && !dismissed
  }, [profile])

  const setOnboardingStep = (nextStep: number) => {
    setStep(nextStep)
    localStorage.setItem(STEP_KEY, String(nextStep))
    if (nextStep > 3) {
      localStorage.setItem(DISMISS_KEY, 'true')
    }
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setStep(4)
  }

  return {
    ready,
    eligible,
    step,
    setOnboardingStep,
    dismiss,
  }
}
