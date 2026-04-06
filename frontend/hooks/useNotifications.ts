'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export interface Notification {
  id: string
  user_id: string
  type: 'job_complete' | 'job_failed' | 'quota_warning' | 'quota_exhausted' | string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data } = await api.notifications.list()
      setNotifications((data || []) as Notification[])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await api.notifications.markRead(id)
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    },
    [],
  )

  const markAllAsRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead()
      setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!user?.id) return

    fetchNotifications()

    const channel: RealtimeChannel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev].slice(0, 50))

          toast(newNotification.title, {
            description: newNotification.message,
            action: newNotification.link
              ? {
                  label: 'View',
                  onClick: () => router.push(newNotification.link || '/dashboard'),
                }
              : undefined,
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, router, supabase, user?.id])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  }
}
