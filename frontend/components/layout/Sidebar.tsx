'use client';

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
  LogOut
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Database, label: 'My Datasets', href: '/datasets' },
  { icon: Upload, label: 'Upload', href: '/upload' },
  { icon: Store, label: 'Marketplace', href: '/marketplace' },
  { icon: DollarSign, label: 'Sell Data', href: '/sell' },
  { icon: Key, label: 'API Keys', href: '/api-keys' },
  { icon: CreditCard, label: 'Billing', href: '/billing' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <aside 
      className="fixed left-0 top-0 h-screen w-16 flex flex-col border-r border-[rgba(167,139,250,0.10)]"
      style={{ 
        background: 'rgba(255,255,255,0.04)', 
        backdropFilter: 'blur(20px)', 
        WebkitBackdropFilter: 'blur(20px)' 
      }}
    >
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
            >
              {isActive && (
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-[#a78bfa]"
                  style={{ boxShadow: '0 0 12px rgba(167,139,250,0.5)' }}
                />
              )}
              <Icon 
                className={`w-5 h-5 transition-colors ${
                  isActive 
                    ? 'text-[#a78bfa]' 
                    : 'text-[rgba(241,240,255,0.38)] group-hover:text-[rgba(241,240,255,0.65)]'
                }`}
              />
            </Link>
          );
        })}
      </nav>

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
    </aside>
  );
}
