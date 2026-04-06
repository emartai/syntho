'use client';

import Link from 'next/link';
import { CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types';

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onMarkAsRead,
  onClose,
}: NotificationPanelProps) {
  return (
    <div
      className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-[rgba(167,139,250,0.10)] overflow-hidden"
      style={{
        background: 'rgba(14,10,26,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 0 20px rgba(167,139,250,0.15)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(167,139,250,0.10)]">
        <span className="text-sm font-semibold text-[#f1f0ff]">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
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
                if (!notification.read) onMarkAsRead(notification.id);
                onClose();
              }}
              className={`flex items-start gap-3 px-4 py-3 border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.07)] transition-colors ${
                !notification.read ? 'bg-[rgba(167,139,250,0.05)]' : ''
              }`}
            >
              <div
                className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                  !notification.read ? 'bg-[#a78bfa]' : 'bg-[rgba(241,240,255,0.2)]'
                }`}
              />
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

      {notifications.length > 10 && (
        <Link
          href="/notifications"
          onClick={onClose}
          className="block px-4 py-3 text-center text-sm text-[#a78bfa] hover:text-[#c4b5fd] border-t border-[rgba(167,139,250,0.10)]"
        >
          View all notifications
        </Link>
      )}
    </div>
  );
}
