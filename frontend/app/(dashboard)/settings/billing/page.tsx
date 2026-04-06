'use client';

import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { openFlutterwaveCheckout } from '@/lib/flutterwave';

const PLANS = [
  { id: 'free', name: 'Free', price: '₦0/mo', amount: 0, rows: '10,000 rows max per job', jobs: '10 jobs per month' },
  { id: 'pro', name: 'Pro', price: '₦5,000/mo', amount: 5000, rows: '500,000 rows max per job', jobs: 'Unlimited jobs' },
  { id: 'growth', name: 'Growth', price: '₦15,000/mo', amount: 15000, rows: '5,000,000 rows max per job', jobs: 'Unlimited jobs + priority queue' },
] as const;

export default function BillingPage() {
  const { user, profile, refreshProfile } = useAuth();

  const billingQuery = useQuery({
    queryKey: ['billing-status'],
    queryFn: async () => {
      const response = await api.billing.status();
      return response.data;
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (payload: { plan: 'pro' | 'growth'; tx_ref: string; transaction_id?: string | number }) => {
      const response = await api.billing.upgrade(payload);
      return response.data;
    },
    onSuccess: async (data) => {
      toast.success(`Upgraded to ${data.plan}`);
      await refreshProfile();
      billingQuery.refetch();
    },
    onError: (error: any) => {
      toast.error('Unable to confirm payment', {
        description: error?.response?.data?.detail || error?.message,
      });
    },
  });

  const currentPlan = billingQuery.data?.plan || profile?.plan || 'free';
  const jobsUsed = billingQuery.data?.jobs_used_this_month || profile?.jobs_used_this_month || 0;
  const usagePct = Math.min(100, (jobsUsed / 10) * 100);
  const flutterwaveKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;

  const customerName = useMemo(
    () => profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Syntho User',
    [profile, user]
  );

  const startCheckout = async (plan: 'pro' | 'growth', amount: number) => {
    if (!user?.email || !flutterwaveKey) {
      toast.error('Billing is not configured for this environment.');
      return;
    }

    const tx_ref = `SYNTHO-SUB-${user.id}-${plan}-${Date.now()}`;
    await openFlutterwaveCheckout({
      public_key: flutterwaveKey,
      tx_ref,
      amount,
      currency: 'NGN',
      customer: {
        email: user.email,
        name: customerName,
      },
      customizations: {
        title: 'Syntho Subscription',
        description: `Upgrade to ${plan.toUpperCase()}`,
      },
      callback: async (response) => {
        await upgradeMutation.mutateAsync({
          plan,
          tx_ref,
          transaction_id: response.transaction_id || response.tx_ref,
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-text">{currentPlan.toUpperCase()}</p>
              <p className="text-sm text-[rgba(241,240,255,0.55)]">
                Quota resets on {billingQuery.data?.quota_reset_at ? new Date(billingQuery.data.quota_reset_at).toLocaleDateString() : 'the first of the month'}.
              </p>
            </div>
            <div className="rounded-full border border-[rgba(167,139,250,0.2)] px-3 py-1 text-xs text-primary">
              {currentPlan === 'free' ? 'Starter' : 'Paid'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-[rgba(241,240,255,0.65)]">
              <span>Usage this month</span>
              <span>{jobsUsed} / 10 free jobs</span>
            </div>
            <Progress value={currentPlan === 'free' ? usagePct : 100} />
            <p className="text-xs text-[rgba(241,240,255,0.45)]">
              {currentPlan === 'free' ? 'Free plan includes Gaussian Copula only and a 10,000 row cap.' : 'Paid plans include CTGAN and expanded row limits.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const canUpgrade = plan.id !== 'free' && !isCurrent;

          return (
            <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-text">{plan.price}</p>
                  <p className="text-sm text-[rgba(241,240,255,0.55)]">{plan.jobs}</p>
                </div>
                <ul className="space-y-2 text-sm text-[rgba(241,240,255,0.65)]">
                  <li>{plan.rows}</li>
                  <li>{plan.id === 'free' ? 'Gaussian Copula only' : 'CTGAN + Gaussian Copula'}</li>
                  <li>{plan.id === 'free' ? 'No API keys' : 'API keys included'}</li>
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full">
                    Current plan
                  </Button>
                ) : canUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => startCheckout(plan.id, plan.amount)}
                    disabled={upgradeMutation.isPending}
                  >
                    Upgrade
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Included
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {billingQuery.data?.payment_history?.length ? (
            <div className="space-y-3">
              {billingQuery.data.payment_history.map((item: any) => (
                <div key={item.tx_ref} className="flex flex-col gap-1 rounded-xl border border-[rgba(167,139,250,0.12)] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{String(item.plan || '').toUpperCase()}</p>
                    <p className="text-xs text-[rgba(241,240,255,0.45)]">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                  <div className="text-sm text-[rgba(241,240,255,0.65)]">
                    {item.currency} {item.amount} · {item.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[rgba(241,240,255,0.45)]">No payment history yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
