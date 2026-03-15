import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        className="max-w-md w-full rounded-[14px] p-8 text-center border border-[rgba(167,139,250,0.10)]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex justify-center mb-6">
          <Logo size={48} showText />
        </div>

        <h1
          className="text-6xl font-bold mb-4"
          style={{ fontFamily: 'Clash Display, sans-serif', color: '#a78bfa' }}
        >
          404
        </h1>

        <h2
          className="text-xl font-semibold mb-2"
          style={{ fontFamily: 'Clash Display, sans-serif', color: '#f1f0ff' }}
        >
          Page Not Found
        </h2>

        <p className="text-sm text-[rgba(241,240,255,0.65)] mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button variant="default" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}