'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { RefreshCw, Home } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    toast.error('Something went wrong', {
      description: error.message || 'An unexpected error occurred',
    });
  }, [error]);

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
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'Clash Display, sans-serif', color: '#f1f0ff' }}
        >
          Oops! Something went wrong
        </h1>

        <p className="text-sm text-[rgba(241,240,255,0.65)] mb-6">
          We encountered an unexpected error. Please try again or go back to the dashboard.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            variant="default"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <a href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </a>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-[rgba(241,240,255,0.25)]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}