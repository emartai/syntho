'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, DollarSign, TrendingUp, Clock, Building2, Check, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { PRICING, detectCurrency, type Currency } from '@/lib/pricing';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuroraBadge } from '@/components/shared/AuroraBadge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function PricingSection() {
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('syntho_currency') as Currency | null;
    if (saved && (saved === 'NGN' || saved === 'USD')) {
      setCurrency(saved);
    } else {
      setCurrency(detectCurrency());
    }
  }, []);

  const handleCurrencyToggle = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem('syntho_currency', newCurrency);
  };

  const handleWaitlist = async (plan: string) => {
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('waitlist')
        .upsert({ email, plan }, { onConflict: 'email' });
      if (error) throw error;
      toast.success('You\'re on the waitlist! We\'ll notify you when payments launch.');
      setEmail('');
      setSelectedPlan(null);
    } catch (err: any) {
      toast.error('Failed to join waitlist', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const prices = PRICING[currency];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Pricing Plans</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">Choose the plan that fits your synthetic data needs</p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => handleCurrencyToggle('NGN')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
            currency === 'NGN' 
              ? 'bg-[rgba(167,139,250,0.20)] border border-primary text-primary' 
              : 'text-[rgba(241,240,255,0.38)] hover:text-text'
          }`}
        >
          <span>🇳🇬</span><span>NGN</span>
        </button>
        <button
          onClick={() => handleCurrencyToggle('USD')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
            currency === 'USD' 
              ? 'bg-[rgba(167,139,250,0.20)] border border-primary text-primary' 
              : 'text-[rgba(241,240,255,0.38)] hover:text-text'
          }`}
        >
          <span>🌍</span><span>USD</span>
        </button>
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
              <span className="font-display text-4xl font-bold text-text">₦0</span>
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
              <span className="font-display text-4xl font-bold text-primary">{prices.pro_display}</span>
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
                <span className="text-[rgba(241,240,255,0.65)]">All 3 methods (CTGAN, TVAE, Copula)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">All reports + PDF downloads</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">Marketplace access (v2)</span>
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
              <span className="font-display text-4xl font-bold text-text">{prices.payg_display}</span>
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
                <span className="text-[rgba(241,240,255,0.65)]">All 3 methods included</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">All reports included</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <span className="text-[rgba(241,240,255,0.65)]">Pay only for what you use</span>
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
  );
}

export default function BillingPage() {
  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['my-purchases'],
    queryFn: async () => {
      const response = await api.purchases.getMyPurchases();
      return response.data;
    },
  });

  const { data: sellerRevenue, isLoading: sellerLoading } = useQuery({
    queryKey: ['seller-revenue'],
    queryFn: async () => {
      const response = await api.seller.getRevenue();
      return response.data;
    },
    enabled: true,
  });

  const { data: sellerTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['seller-transactions'],
    queryFn: async () => {
      const response = await api.seller.getTransactions();
      return response.data;
    },
    enabled: true,
  });

  const { data: payoutStatus } = useQuery({
    queryKey: ['payout-status'],
    queryFn: async () => {
      const response = await api.seller.getPayoutStatus();
      return response.data;
    },
  });

  const isSeller = sellerRevenue !== undefined;
  const totalSpent = (Array.isArray(purchases) ? purchases : []).reduce((sum: number, p: any) => sum + (p?.amount ?? 0), 0);

  if (!isSeller) {
    return <PricingSection />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Billing & Revenue</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">Track your earnings and manage payouts</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">₦{(sellerRevenue?.total_earned || 0).toLocaleString()}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">All time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">₦{(sellerRevenue?.this_month_earnings || 0).toLocaleString()}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">Current month earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">₦{(sellerRevenue?.pending || 0).toLocaleString()}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">Awaiting settlement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">Platform Fee</CardTitle>
            <div className="h-4 w-4 rounded-full bg-[rgba(167,139,250,0.3)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">₦{(sellerRevenue?.platform_fee_deducted || 0).toLocaleString()}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">20% fee deducted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          {!payoutStatus?.is_setup && (
            <Button variant="secondary" onClick={() => window.location.href = '/billing/payout-setup'}>
              <Building2 className="h-4 w-4 mr-2" />Set Up Payout
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !sellerTransactions || (Array.isArray(sellerTransactions) && sellerTransactions.length === 0) ? (
            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-8 text-center">
              <p className="text-[rgba(241,240,255,0.65)]">No transactions yet</p>
              <p className="text-sm text-[rgba(241,240,255,0.38)] mt-1">Your sales will appear here once buyers purchase your datasets</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(167,139,250,0.10)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Buyer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Dataset</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Your Share</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Fee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(sellerTransactions) ? sellerTransactions : []).map((tx: any) => (
                    <tr key={tx.id} className="border-b border-[rgba(167,139,250,0.10)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-3 px-4 text-[rgba(241,240,255,0.65)]">{tx.buyer_anonymized ?? 'Anonymous'}</td>
                      <td className="py-3 px-4 font-medium text-text">{tx.listing_title ?? 'Unknown'}</td>
                      <td className="py-3 px-4 text-text">₦{(tx.amount ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-4 font-medium text-green-400">₦{(tx.seller_amount ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-[rgba(241,240,255,0.38)]">-₦{(tx.platform_fee ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-[rgba(241,240,255,0.65)]">{tx.created_at ? format(new Date(tx.created_at), 'MMM d, yyyy') : 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}