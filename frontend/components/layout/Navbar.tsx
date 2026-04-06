'use client';

import { Bell, CreditCard, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { NotificationPanel } from '@/components/shared/NotificationPanel';

const pageTitles: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/datasets':        'My Datasets',
  '/upload':          'Upload Dataset',
  '/api-keys':        'API Keys',
  '/settings/billing':'Billing',
};

export function Navbar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const pageTitle = pageTitles[pathname] || 'Dashboard';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="sticky top-0 z-20 h-16 border-b border-[rgba(167,139,250,0.10)] flex items-center justify-between px-6"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: 'Clash Display, sans-serif',
          color: '#f1f0ff',
        }}
      >
        {pageTitle}
      </h1>

      <div className="flex items-center gap-4 relative">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            aria-haspopup="dialog"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.07)] transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-[rgba(241,240,255,0.65)]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#ef4444] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationPanel
              notifications={notifications}
              unreadCount={unreadCount}
              isLoading={isLoading}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            aria-label="Open user menu"
            aria-expanded={showDropdown}
            aria-haspopup="menu"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 h-9 px-3 rounded-lg hover:bg-[rgba(255,255,255,0.07)] transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'User'}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[rgba(167,139,250,0.12)] flex items-center justify-center">
                <span className="text-[#a78bfa] text-xs font-semibold">
                  {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <span className="text-sm text-[rgba(241,240,255,0.65)] hidden md:block">
              {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
            </span>
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-lg border border-[rgba(167,139,250,0.10)] py-1"
              style={{
                background: 'rgba(14,10,26,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 0 20px rgba(167,139,250,0.15)',
              }}
            >
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[rgba(241,240,255,0.65)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href="/settings/billing"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[rgba(241,240,255,0.65)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <CreditCard className="w-4 h-4" />
                Billing
              </Link>
              <hr className="my-1 border-[rgba(167,139,250,0.10)]" />
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  signOut();
                }}
                className="flex items-center gap-3 px-4 py-2 text-sm text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)] transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
