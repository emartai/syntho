'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'What is synthetic data?',
      answer:
        'Synthetic data is artificially generated data that mirrors the statistical properties of your real dataset — same distributions, correlations, and patterns — but contains no real personal information. It cannot be traced back to any individual.',
    },
    {
      question: "Is Syntho's synthetic data GDPR compliant?",
      answer:
        'Yes. Every dataset is scored for re-identification risk and accompanied by a compliance report aligned with GDPR Article 89 (anonymisation techniques) and HIPAA Safe Harbor.',
    },
    {
      question: 'What file formats do you support?',
      answer:
        'CSV, JSON, Parquet, and XLSX. Up to 500,000 rows on the Pro plan.',
    },
    {
      question: 'How long does generation take?',
      answer:
        'Gaussian Copula takes 1–3 minutes for most datasets. CTGAN and TVAE take 5–15 minutes depending on dataset size and complexity. All jobs run on GPU infrastructure.',
    },
    {
      question: 'What is a privacy score?',
      answer:
        'A score from 0 to 100 measuring how safe your synthetic data is. It factors in PII detection, singling-out risk, linkability risk, and inference risk. 80+ is Low risk. Below 40 is Critical.',
    },
    {
      question: 'Can I use the free plan for production?',
      answer:
        'Yes. The free plan includes full privacy scoring and compliance reports. The 3 jobs/month limit resets on the 1st of each month.',
    },
    {
      question: 'When is the marketplace launching?',
      answer:
        'The marketplace — where you can buy and sell synthetic datasets — is launching in v2. Join the waitlist to be notified first.',
    },
    {
      question: 'Is my original data safe?',
      answer:
        'Your uploaded files are stored encrypted in Supabase Storage with per-user access policies. Only you can access your files. We never use your data for training.',
    },
  ];

  return (
    <section id="faq" className="py-32">
      <div className="max-w-3xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-[#6366f1] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
            FAQ
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
            Questions, answered
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-0">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-white/10">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full py-5 flex items-center justify-between text-left group"
              >
                <span className="text-white font-medium pr-4">{faq.question}</span>
                <ChevronRight
                  size={20}
                  className={`text-white/40 transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-90' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96 pb-5' : 'max-h-0'
                }`}
              >
                <p className="text-white/50 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
