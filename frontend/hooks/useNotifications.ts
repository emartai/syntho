import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'job_complete' | 'job_failed' | 'quota_warning' | 'quota_exhausted';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.notifications.list();
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    const supabase = createClient();
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      activeChannel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const incoming = payload.new as Notification;
            setNotifications((prev) => [incoming, ...prev]);
            toast.success(incoming.title, {
              description: incoming.message,
            });
          }
        )
        .subscribe();
    });

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
