'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFlutterwave } from 'flutterwave-react-v3'
import { Check } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { FREE_JOBS_QUOTA } from '@/lib/pricing'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

const PLAN_PRICES = {
  pro: 5000,
  growth: 15000,
} as const

type PlanType = 'free' | 'pro' | 'growth'

interface BillingStatus {
  plan: PlanType
  jobs_used_this_month: number
  quota_reset_at?: string | null
  history: Array<{
    created_at: string
    plan: string
    amount: number
    status: string
    currency: string
    flutterwave_tx_ref: string
  }>
}

export default function BillingPage() {
  const { user, profile } = useAuth()
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingPlan, setPendingPlan] = useState<'pro' | 'growth' | null>(null)
  const [txRef, setTxRef] = useState<string>('')

  const currentPlan = (billingStatus?.plan ?? profile?.plan ?? 'free') as PlanType
  const jobsUsed = billingStatus?.jobs_used_this_month ?? profile?.jobs_used_this_month ?? 0
  const usagePercent = Math.min(100, Math.round((jobsUsed / FREE_JOBS_QUOTA) * 100))

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.billing.status()
        setBillingStatus(data as BillingStatus)
      } catch {
        toast.error('Failed to load billing status')
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  const flutterwaveConfig = useMemo(
    () => ({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '',
      tx_ref: txRef,
      amount: pendingPlan ? PLAN_PRICES[pendingPlan] : 0,
      currency: 'NGN',
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: user?.email ?? profile?.email ?? 'customer@syntho.ai',
        name: profile?.full_name ?? user?.email ?? 'Syntho User',
      },
      customizations: {
        title: 'Syntho Subscription Upgrade',
        description: 'Upgrade your Syntho plan',
      },
    }),
    [pendingPlan, profile?.email, profile?.full_name, txRef, user?.email],
  )

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig)

  useEffect(() => {
    if (!pendingPlan || !txRef) return

    if (!process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY) {
      toast.error('Flutterwave public key is not configured')
      setPendingPlan(null)
      setTxRef('')
      return
    }

    handleFlutterPayment({
      callback: async () => {
        try {
          await api.billing.upgrade(txRef)
          toast.success(`Plan upgraded to ${pendingPlan.toUpperCase()}`)
          const { data } = await api.billing.status()
          setBillingStatus(data as BillingStatus)
        } catch (err: any) {
          toast.error('Unable to verify payment', {
            description: err?.response?.data?.detail ?? 'Verification failed',
          })
        } finally {
          setPendingPlan(null)
          setTxRef('')
        }
      },
      onClose: () => {
        setPendingPlan(null)
        setTxRef('')
      },
    })
  }, [handleFlutterPayment, pendingPlan, txRef])

  const startUpgrade = (plan: 'pro' | 'growth') => {
    if (!user?.id) {
      toast.error('Please log in again')
      return
    }
    const nextTxRef = `SYNTHO-SUB-${user.id}-${plan}-${Date.now()}`
    setPendingPlan(plan)
    setTxRef(nextTxRef)
  }

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-sm text-[rgba(241,240,255,0.65)]">Loading billing details...</div>
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Billing & Plan</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">Manage your plan, usage, and payment history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Plan
            <Badge>{currentPlan.toUpperCase()}</Badge>
          </CardTitle>
          <CardDescription>
            {currentPlan === 'free'
              ? 'Free tier usage resets monthly.'
              : `Renewal date: ${billingStatus?.quota_reset_at ? new Date(billingStatus.quota_reset_at).toLocaleDateString() : 'N/A'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[rgba(241,240,255,0.72)]">{jobsUsed} of {FREE_JOBS_QUOTA} jobs used this month</p>
          <Progress value={usagePercent} className={jobsUsed >= 8 ? 'bg-red-500/20' : ''} />
          {currentPlan === 'free' && (
            <p className="text-xs text-[rgba(241,240,255,0.60)]">10,000 rows max per job</p>
          )}
        </CardContent>
      </Card>

      {currentPlan === 'free' && (
        <section className="grid gap-4 md:grid-cols-3">
          <PlanCard
            title="Free"
            price="₦0/mo"
            features={['10 jobs / month', '10,000 rows / job', 'Gaussian Copula', 'No API keys']}
            cta="Current"
            onClick={undefined}
          />
          <PlanCard
            title="Pro"
            price="₦5,000/mo"
            features={['Unlimited jobs', '500k rows / job', 'CTGAN enabled', 'API keys']}
            cta={pendingPlan === 'pro' ? 'Opening checkout...' : 'Upgrade'}
            onClick={() => startUpgrade('pro')}
            disabled={Boolean(pendingPlan)}
            highlighted
          />
          <PlanCard
            title="Growth"
            price="₦15,000/mo"
            features={['Everything in Pro', 'Priority GPU', 'PDF branding', 'Best for teams']}
            cta={pendingPlan === 'growth' ? 'Opening checkout...' : 'Upgrade'}
            onClick={() => startUpgrade('growth')}
            disabled={Boolean(pendingPlan)}
          />
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {billingStatus?.history?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[rgba(241,240,255,0.60)]">
                  <tr>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingStatus.history.map((item) => (
                    <tr key={item.flutterwave_tx_ref} className="border-t border-[rgba(167,139,250,0.12)]">
                      <td className="py-2 pr-4">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4 uppercase">{item.plan}</td>
                      <td className="py-2 pr-4">{item.currency} {item.amount.toLocaleString()}</td>
                      <td className="py-2 capitalize">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[rgba(241,240,255,0.60)]">No payments yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PlanCard({
  title,
  price,
  features,
  cta,
  onClick,
  disabled,
  highlighted,
}: {
  title: string
  price: string
  features: string[]
  cta: string
  onClick?: () => void
  disabled?: boolean
  highlighted?: boolean
}) {
  return (
    <Card className={highlighted ? 'border-primary/30 shadow-[0_0_24px_rgba(167,139,250,0.20)]' : ''}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-xl font-semibold text-text">{price}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-[rgba(241,240,255,0.72)]">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={onClick} disabled={disabled || !onClick}>
          {cta}
        </Button>
      </CardContent>
    </Card>
  )
}
