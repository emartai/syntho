'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { PRICING, detectCurrency, type Currency } from '@/lib/pricing';

export function Pricing() {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('syntho_currency') as Currency;
    setCurrency(saved || detectCurrency());
  }, []);

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem('syntho_currency', newCurrency);
  };

  const handleWaitlistClick = (plan: string) => {
    setSelectedPlan(plan);
    setShowWaitlist(true);
    setSubmitSuccess(false);
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: selectedPlan }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setEmail('');
      }
    } catch {
      // Submission failed - user can try again
    } finally {
      setIsSubmitting(false);
    }
  };

  const pricing = PRICING[currency];

  const plans = [
    {
      name: 'Free',
      price: currency === 'NGN' ? '₦0' : '$0',
      subtitle: 'Forever free',
      features: [
        { text: '3 generation jobs/month', included: true },
        { text: 'Up to 5,000 rows per job', included: true },
        { text: 'Gaussian Copula method', included: true },
        { text: 'Privacy score included', included: true },
        { text: 'Compliance report included', included: true },
        { text: 'CTGAN & TVAE', included: false },
        { text: 'Marketplace access (coming v2)', included: false },
      ],
      cta: 'Get Started Free',
      ctaLink: '/login',
      popular: false,
    },
    {
      name: 'Pro',
      price: pricing.pro_display.split('/')[0],
      subtitle: 'Billed monthly',
      features: [
        { text: 'Unlimited generation jobs', included: true },
        { text: 'Up to 500,000 rows per job', included: true },
        { text: 'All 3 methods (CTGAN, TVAE, Gaussian)', included: true },
        { text: 'Privacy score + compliance report', included: true },
        { text: 'Marketplace access (v2)', included: true },
        { text: 'Priority GPU queue', included: true },
      ],
      cta: 'Join Waitlist',
      ctaAction: () => handleWaitlistClick('Pro'),
      popular: true,
    },
    {
      name: 'Pay-as-you-go',
      price: pricing.payg_display.split('/')[0],
      subtitle: 'No subscription',
      features: [
        { text: 'All 3 generation methods', included: true },
        { text: 'Up to 100,000 rows per job', included: true },
        { text: 'Privacy score + compliance report', included: true },
        { text: 'Pay only when you generate', included: true },
        { text: 'Marketplace access', included: false },
      ],
      cta: 'Join Waitlist',
      ctaAction: () => handleWaitlistClick('Pay-as-you-go'),
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-[#6366f1] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
            PRICING
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-white/60 text-lg">Start free. Upgrade when you're ready.</p>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <button
            onClick={() => handleCurrencyChange('NGN')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currency === 'NGN'
                ? 'bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white'
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            🇳🇬 NGN
          </button>
          <button
            onClick={() => handleCurrencyChange('USD')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currency === 'USD'
                ? 'bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white'
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            🌍 USD
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 border transition-all ${
                plan.popular
                  ? 'border-[#6366f1]/50 bg-[#6366f1]/5 md:scale-105'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
              style={
                plan.popular
                  ? { boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)' }
                  : { backdropFilter: 'blur(20px)' }
              }
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white text-xs font-semibold px-4 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  {plan.name}
                </h3>
                <div className="font-display text-3xl font-bold text-white mb-1">
                  {plan.price}
                  {plan.name !== 'Free' && (
                    <span className="text-base text-white/40 font-normal">
                      /{plan.name === 'Pro' ? 'month' : 'job'}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-sm">{plan.subtitle}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check size={16} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                    ) : (
                      <X size={16} className="text-white/20 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={feature.included ? 'text-white/60' : 'text-white/30'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.ctaLink ? (
                <a
                  href={plan.ctaLink}
                  className={`block w-full text-center py-3 rounded-full font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white hover:brightness-110'
                      : 'border border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                </a>
              ) : (
                <button
                  onClick={plan.ctaAction}
                  className={`w-full py-3 rounded-full font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white hover:brightness-110'
                      : 'border border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Waitlist Form */}
        {showWaitlist && (
          <div className="max-w-md mx-auto">
            {submitSuccess ? (
              <div className="text-center py-6 px-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]">
                ✓ You're on the list — we'll notify you
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#6366f1]/50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white font-semibold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Notify Me'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
