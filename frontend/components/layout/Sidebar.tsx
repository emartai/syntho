'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Upload,
  Store,
  DollarSign,
  Key,
  CreditCard,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';
import { FLAGS } from '@/lib/flags';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', show: true },
  { icon: Database, label: 'My Datasets', href: '/datasets', show: true },
  { icon: Upload, label: 'Upload', href: '/upload', show: true },
  { icon: Store, label: 'Marketplace', href: '/marketplace', show: FLAGS.MARKETPLACE },
  { icon: DollarSign, label: 'Sell Data', href: '/sell', show: FLAGS.MARKETPLACE },
  { icon: Key, label: 'API Keys', href: '/api-keys', show: FLAGS.API_KEYS },
  { icon: CreditCard, label: 'Billing', href: '/billing', show: true },
].filter(item => item.show);

function QuotaMeter() {
  const { profile } = useAuth();
  const [quota, setQuota] = useState<{ plan: string; jobs_used_this_month: number; jobs_quota: number } | null>(null);

  useEffect(() => {
    if (profile?.id) {
      const supabase = createClient();
      supabase
        .from('profiles')
        .select('plan, jobs_used_this_month, jobs_quota')
        .eq('id', profile.id)
        .single()
        .then(({ data }) => {
          if (data) setQuota(data);
        });
    }
  }, [profile?.id]);

  if (!quota) return null;

  const isFree = quota.plan === 'free';
  const used = quota.jobs_used_this_month;
  const total = quota.jobs_quota;
  const percentage = isFree ? Math.min(used / total, 1) : 0;
  
  const getColor = () => {
    if (used >= total) return '#ef4444';
    if (used >= 2) return '#f59e0b';
    return '#22c55e';
  };

  if (!isFree) {
    return (
      <div className="mx-2 mb-3 rounded-lg bg-[rgba(6,182,212,0.10)] border border-[rgba(6,182,212,0.20)] p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-medium text-cyan-400">Pro Plan — Unlimited jobs</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-3 rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[rgba(241,240,255,0.65)]">{used} / {total} free jobs used</span>
        {used >= total && (
          <Link href="/billing" className="text-xs text-primary hover:underline">
            Upgrade
          </Link>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage * 100}%`, background: getColor() }}
        />
      </div>
      {used >= total && (
        <Link 
          href="/billing" 
          className="mt-2 block w-full text-center text-xs py-1.5 rounded bg-gradient-to-r from-primary to-accent text-white font-medium"
        >
          Upgrade to Pro
        </Link>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-[rgba(167,139,250,0.10)]">
        <Logo size={28} showText={false} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex h-12 items-center justify-center group"
              title={item.label}
              onClick={() => setMobileOpen(false)}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-[#a78bfa]"
                  style={{ boxShadow: '0 0 12px rgba(167,139,250,0.5)' }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${isActive ? 'text-[#a78bfa]' : 'text-[rgba(241,240,255,0.38)] group-hover:text-[rgba(241,240,255,0.65)]'}`}
              />
            </Link>
          );
        })}
      </nav>

      {/* Quota Meter */}
      <QuotaMeter />

      {/* User section */}
      <div className="border-t border-[rgba(167,139,250,0.10)] p-2">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'User'}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[rgba(167,139,250,0.12)] flex items-center justify-center">
            <span className="text-[#a78bfa] text-sm font-semibold">
              {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <button
          onClick={signOut}
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-[rgba(239,68,68,0.12)] transition-colors group"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-[rgba(241,240,255,0.38)] group-hover:text-[#ef4444]" />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex md:hidden h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.08)] border border-[rgba(167,139,250,0.10)]"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-[rgba(241,240,255,0.65)]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-16 flex flex-col border-r border-[rgba(167,139,250,0.10)] transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{
          background: 'rgba(5,3,15,0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Close button for mobile */}
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute -right-10 top-4 z-50 flex md:hidden h-8 w-8 items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)]"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-[rgba(241,240,255,0.65)]" />
          </button>
        )}
        {sidebarContent}
      </aside>
    </>
  );
}
