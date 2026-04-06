'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, Upload, Key, CreditCard, LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { FREE_JOBS_QUOTA } from '@/lib/pricing';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Database, label: 'My Datasets', href: '/datasets' },
  { icon: Upload, label: 'Upload', href: '/upload' },
  { icon: Key, label: 'API Keys', href: '/api-keys' },
  { icon: CreditCard, label: 'Billing', href: '/settings/billing' },
];

const planColors: Record<string, { bg: string; text: string; label: string }> = {
  free: { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa', label: 'Free' },
  pro: { bg: 'rgba(6,182,212,0.12)', text: '#06b6d4', label: 'Pro' },
  growth: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', label: 'Growth' },
};

function QuotaMeter() {
  const { user } = useAuth();
  const [quota, setQuota] = useState<{ plan: string; jobs_used_this_month: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('plan, jobs_used_this_month')
      .eq('id', user.id)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setQuota(data[0] as { plan: string; jobs_used_this_month: number });
      });
  }, [user?.id]);

  if (!quota) return null;

  const isFree = quota.plan === 'free';
  const used = quota.jobs_used_this_month ?? 0;
  const total = FREE_JOBS_QUOTA;
  const pct = isFree ? Math.min(used / total, 1) : 0;

  const barColor = used >= total ? '#ef4444' : used >= 8 ? '#f59e0b' : '#22c55e';

  if (!isFree) {
    return (
      <div className="hidden md:block mx-3 mb-3 rounded-lg bg-[rgba(6,182,212,0.10)] border border-[rgba(6,182,212,0.20)] px-3 py-2">
        <span className="text-xs font-medium text-cyan-400">{planColors[quota.plan]?.label ?? 'Pro'} — Unlimited</span>
      </div>
    );
  }

  return (
    <div className="hidden md:block mx-3 mb-3 rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[rgba(241,240,255,0.65)]">{used} / {total} jobs</span>
      </div>
      <div className="h-1 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct * 100}%`, background: barColor }} />
      </div>
    </div>
  );
}

function UserFooter() {
  const { user, profile, signOut } = useAuth();

  const name = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initial = name[0]?.toUpperCase() ?? 'U';
  const planKey = profile?.plan ?? 'free';
  const planStyle = planColors[planKey] ?? planColors.free;

  return (
    <div className="border-t border-[rgba(167,139,250,0.10)] p-3">
      <div className="flex items-center gap-2 mb-2">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={name} className="w-8 h-8 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold" style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
            {initial}
          </div>
        )}
        <div className="hidden md:block flex-1 min-w-0">
          <p className="text-xs font-medium text-[#f1f0ff] truncate">{name}</p>
          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5" style={{ background: planStyle.bg, color: planStyle.text }}>
            {planStyle.label}
          </span>
        </div>
      </div>
      <button
        onClick={signOut}
        className="flex items-center justify-center md:justify-start gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.10)] transition-colors group"
        title="Sign out"
      >
        <LogOut className="w-4 h-4 text-[rgba(241,240,255,0.38)] group-hover:text-[#ef4444]" />
        <span className="hidden md:inline text-xs text-[rgba(241,240,255,0.38)] group-hover:text-[#ef4444]">Sign out</span>
      </button>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-20 md:w-56 flex flex-col border-r border-[rgba(167,139,250,0.10)]"
      style={{
        background: 'rgba(5,3,15,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex h-16 items-center justify-center md:justify-start md:px-4 border-b border-[rgba(167,139,250,0.10)]">
        <div className="md:hidden">
          <Logo size={26} showText={false} />
        </div>
        <div className="hidden md:block">
          <Logo size={26} showText={true} />
        </div>
      </div>

      <nav className="flex-1 py-3 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-center md:justify-start gap-3 h-10 px-3 rounded-lg transition-all group ${
                isActive
                  ? 'bg-[rgba(167,139,250,0.12)] text-[#a78bfa]'
                  : 'text-[rgba(241,240,255,0.45)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(241,240,255,0.80)]'
              }`}
              title={item.label}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#a78bfa]" style={{ boxShadow: '0 0 8px rgba(167,139,250,0.6)' }} />}
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <QuotaMeter />
      <UserFooter />
    </aside>
  );
}
