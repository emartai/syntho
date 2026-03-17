'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { AuroraBackground } from '@/components/layout/AuroraBackground';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05030f] flex-col gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a78bfa] border-t-transparent" />
        <p className="text-sm text-[rgba(241,240,255,0.65)]">Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <QueryProvider>
      <div className="relative min-h-screen bg-[#05030f]">
        <AuroraBackground />
        <div className="relative z-10 flex">
          <Sidebar />
          <div className="flex-1 ml-0 md:ml-16">
            <Navbar />
            <main className="p-4 md:p-6 pt-16 md:pt-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </QueryProvider>
  );
}
