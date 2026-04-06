'use client'

import { useEffect, useState } from 'react'

import { UpgradeModal } from '@/components/shared/UpgradeModal'

export function GlobalUX() {
  const [offline, setOffline] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>()

  useEffect(() => {
    const onOffline = () => setOffline(true)
    const onOnline = () => setOffline(false)
    const onUpgrade = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>
      setUpgradeReason(customEvent.detail?.message)
      setUpgradeOpen(true)
    }

    setOffline(!navigator.onLine)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('syntho:upgrade-required', onUpgrade as EventListener)

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('syntho:upgrade-required', onUpgrade as EventListener)
    }
  }, [])

  return (
    <>
      {offline && (
        <div className="fixed top-0 left-0 right-0 z-[90] bg-red-500/90 px-4 py-2 text-center text-sm font-medium text-white">
          No internet connection
        </div>
      )}
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={upgradeReason} />
    </>
  )
}
