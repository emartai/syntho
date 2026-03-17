'use client'

import { useState, useEffect } from 'react'
import { Check, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuroraBadge } from '@/components/shared/AuroraBadge'
import { toast } from 'sonner'

export default function BillingPage() {
  const [email, setEmail] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleWaitlist = async (plan: string) => {
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('waitlist')
        .upsert({ email, plan }, { onConflict: 'email' })
      if (error) throw error
      toast.success("You're on the waitlist! We'll notify you when payments launch.")
      setEmail('')
      setSelectedPlan(null)
    } catch (err: any) {
      toast.error('Failed to join waitlist', { description: err?.message ?? 'Unknown error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Pricing Plans</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">Choose the plan that fits your synthetic data needs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Free
              <AuroraBadge variant="muted">Current</AuroraBadge>
            </CardTitle>
            <CardDescription>For getting started</CardDescription>
            <div className="mt-4">
              <span className="font-display text-4xl font-bold text-text">$0</span>
              <span className="text-[rgba(241,240,255,0.38)]">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">3 jobs/month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">5,000 rows max per job</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">Gaussian Copula only</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">Privacy + Quality reports</span>
              </li>
            </ul>
            <Button className="w-full" variant="outline" asChild>
              <a href="/dashboard">Get Started</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="relative border-primary/30 shadow-[0_0_20px_rgba(167,139,250,0.15)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <AuroraBadge variant="primary">Most Popular</AuroraBadge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pro
              {selectedPlan === 'pro' && <AuroraBadge variant="accent">Selected</AuroraBadge>}
            </CardTitle>
            <CardDescription>For professionals</CardDescription>
            <div className="mt-4">
              <span className="font-display text-4xl font-bold text-primary">$29/mo</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">Unlimited jobs</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">500,000 rows max per job</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">All methods (CTGAN, Copula)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">All reports + PDF downloads</span>
              </li>
            </ul>
            {selectedPlan === 'pro' ? (
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  className="w-full bg-gradient-to-r from-primary to-accent"
                  onClick={() => handleWaitlist('pro')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-primary to-accent"
                onClick={() => setSelectedPlan('pro')}
              >
                <Lock className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader>
            <CardTitle>Pay-as-you-go</CardTitle>
            <CardDescription>Flexible usage</CardDescription>
            <div className="mt-4">
              <span className="font-display text-4xl font-bold text-text">$5/job</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">No subscription</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">All methods included</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">All reports included</span>
              </li>
            </ul>
            {selectedPlan === 'payg' ? (
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => handleWaitlist('payg')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => setSelectedPlan('payg')}
              >
                <Lock className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-6 text-center">
        <p className="text-[rgba(241,240,255,0.65)]">
          Payment processing launching soon — join the waitlist to get early access
        </p>
      </div>
    </div>
  )
}
