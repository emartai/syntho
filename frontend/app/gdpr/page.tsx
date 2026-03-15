import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'GDPR Compliance | Syntho',
};

export default function GdprPage() {
  return (
    <div className="min-h-screen bg-[#05030f] flex items-center justify-center p-6">
      <div
        className="max-w-md w-full rounded-[14px] p-8 text-center border border-[rgba(167,139,250,0.10)]"
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}
      >
        <h1
          className="text-2xl font-bold mb-3"
          style={{ fontFamily: 'Clash Display, sans-serif', color: '#f1f0ff' }}
        >
          GDPR Compliance
        </h1>
        <p className="text-sm text-[rgba(241,240,255,0.55)] mb-6">
          Our GDPR compliance documentation is coming soon. Syntho is designed to help you
          generate GDPR-compliant synthetic data and automatically produces compliance reports
          for every dataset.
        </p>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
