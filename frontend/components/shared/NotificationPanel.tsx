'use client'

import Link from 'next/link'
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import type { Notification } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'

interface NotificationPanelProps {
  notifications: Notification[]
  unreadCount: number
  isLoading?: boolean
  onMarkAllAsRead: () => void
  onMarkAsRead: (id: string) => void
  onClose: () => void
}

function typeIcon(type: string) {
  switch (type) {
    case 'job_complete':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />
    case 'job_failed':
      return <AlertTriangle className="h-4 w-4 text-red-400" />
    case 'quota_warning':
      return <CircleAlert className="h-4 w-4 text-amber-400" />
    case 'quota_exhausted':
      return <CircleAlert className="h-4 w-4 text-red-400" />
    default:
      return <Bell className="h-4 w-4 text-primary" />
  }
}

export function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  onMarkAllAsRead,
  onMarkAsRead,
  onClose,
}: NotificationPanelProps) {
  const visibleNotifications = notifications.slice(0, 50)
  const hasMore = notifications.length > 50

  return (
    <div
      className="absolute right-0 z-30 mt-2 w-96 overflow-hidden rounded-lg border border-[rgba(167,139,250,0.10)]"
      style={{
        background: 'rgba(14,10,26,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 0 20px rgba(167,139,250,0.15)',
      }}
    >
      <div className="flex items-center justify-between border-b border-[rgba(167,139,250,0.10)] px-4 py-3">
        <span className="text-sm font-semibold text-[#f1f0ff]">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 text-xs text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center px-4 py-8 text-sm text-[rgba(241,240,255,0.38)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading notifications...
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[rgba(241,240,255,0.38)]">No notifications yet</div>
        ) : (
          visibleNotifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.link || '/dashboard'}
              onClick={() => {
                if (!notification.read) onMarkAsRead(notification.id)
                onClose()
              }}
              className={`flex items-start gap-3 border-b border-[rgba(167,139,250,0.05)] px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.07)] ${
                !notification.read ? 'bg-[rgba(167,139,250,0.05)]' : ''
              }`}
            >
              <div className="mt-0.5 flex items-center gap-1.5">
                {typeIcon(notification.type)}
                <div
                  className={`h-2 w-2 rounded-full ${
                    !notification.read ? 'bg-[#a78bfa]' : 'bg-[rgba(241,240,255,0.2)]'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${!notification.read ? 'text-[#f1f0ff]' : 'text-[rgba(241,240,255,0.65)]'}`}>
                  {notification.title}
                </p>
                <p className="mt-0.5 text-xs text-[rgba(241,240,255,0.38)]">{notification.message}</p>
                <p className="mt-1 text-xs text-[rgba(241,240,255,0.25)]">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      {hasMore && (
        <div className="border-t border-[rgba(167,139,250,0.10)] p-2">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
