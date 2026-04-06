'use client';

import { Bell, CreditCard, User, LogOut, CheckCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
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
        WebkitBackdropFilter: 'blur(20px)' 
      }}
    >
      {/* Page title */}
      <h1 
        className="text-2xl font-bold"
        style={{ 
          fontFamily: 'Clash Display, sans-serif',
          color: '#f1f0ff'
        }}
      >
        {pageTitle}
      </h1>

      {/* Right section */}
      <div className="flex items-center gap-4 relative">
        {/* Notification bell */}
        <div className="relative">
          <button 
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

          {/* Notification dropdown */}
          {showNotifications && (
            <div 
              ref={notifRef}
              className="absolute right-0 mt-2 w-80 rounded-lg border border-[rgba(167,139,250,0.10)] overflow-hidden"
              style={{ 
                background: 'rgba(14,10,26,0.95)', 
                backdropFilter: 'blur(20px)', 
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 0 20px rgba(167,139,250,0.15)'
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(167,139,250,0.10)]">
                <span className="text-sm font-semibold text-[#f1f0ff]">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[rgba(241,240,255,0.38)]">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.link || '/dashboard'}
                      onClick={() => {
                        if (!notification.read) markAsRead(notification.id);
                        setShowNotifications(false);
                      }}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.07)] transition-colors ${
                        !notification.read ? 'bg-[rgba(167,139,250,0.05)]' : ''
                      }`}
                    >
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                        !notification.read ? 'bg-[#a78bfa]' : 'bg-[rgba(241,240,255,0.2)]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'text-[#f1f0ff]' : 'text-[rgba(241,240,255,0.65)]'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-[rgba(241,240,255,0.38)] truncate mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[rgba(241,240,255,0.25)] mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
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

          {/* Dropdown menu */}
          {showDropdown && (
            <div 
              className="absolute right-0 mt-2 w-48 rounded-lg border border-[rgba(167,139,250,0.10)] py-1"
              style={{ 
                background: 'rgba(14,10,26,0.95)', 
                backdropFilter: 'blur(20px)', 
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 0 20px rgba(167,139,250,0.15)'
              }}
            >
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-2 text-sm text-[rgba(241,240,255,0.65)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <User className="w-4 h-4" />
                Dashboard
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
