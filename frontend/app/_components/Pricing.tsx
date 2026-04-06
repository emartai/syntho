'use client';

import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PLANS } from '@/lib/pricing';

const plans = [
  {
    key: 'free' as const,
    name: PLANS.free.name,
    price: '₦0',
    period: '/month',
    subtitle: 'Forever free',
    features: [
      { text: '10 generation jobs / month', included: true },
      { text: 'Up to 10,000 rows per job', included: true },
      { text: 'Gaussian Copula method', included: true },
      { text: 'Trust Score (privacy + fidelity)', included: true },
      { text: 'GDPR & HIPAA compliance PDF', included: true },
      { text: 'API keys', included: false },
      { text: 'CTGAN method', included: false },
    ],
    cta: 'Get Started Free',
    href: '/login',
    popular: false,
  },
  {
    key: 'pro' as const,
    name: PLANS.pro.name,
    price: '₦5,000',
    period: '/month',
    subtitle: 'Billed monthly',
    features: [
      { text: 'Unlimited generation jobs', included: true },
      { text: 'Up to 500,000 rows per job', included: true },
      { text: 'CTGAN + Gaussian Copula', included: true },
      { text: 'Trust Score (privacy + fidelity)', included: true },
      { text: 'GDPR & HIPAA compliance PDF', included: true },
      { text: 'API keys (sk_live_ access)', included: true },
      { text: 'Priority GPU queue', included: false },
    ],
    cta: 'Upgrade to Pro',
    href: '/login',
    popular: true,
  },
  {
    key: 'growth' as const,
    name: PLANS.growth.name,
    price: '₦15,000',
    period: '/month',
    subtitle: 'Billed monthly',
    features: [
      { text: 'Unlimited generation jobs', included: true },
      { text: 'Up to 5,000,000 rows per job', included: true },
      { text: 'CTGAN + Gaussian Copula', included: true },
      { text: 'Trust Score (privacy + fidelity)', included: true },
      { text: 'GDPR & HIPAA compliance PDF', included: true },
      { text: 'API keys (sk_live_ access)', included: true },
      { text: 'Priority GPU queue', included: true },
    ],
    cta: 'Upgrade to Growth',
    href: '/login',
    popular: false,
  },
];

export function Pricing() {
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
          <p className="text-white/60 text-lg">Start free. Upgrade when you&apos;re ready.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="font-display text-3xl font-bold text-white mb-1">
                  {plan.price}
                  <span className="text-base text-white/40 font-normal">{plan.period}</span>
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

              <Link
                href={plan.href}
                className={`block w-full text-center py-3 rounded-full font-semibold text-sm transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-[#6366f1] to-[#22d3ee] text-white hover:brightness-110'
                    : 'border border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
