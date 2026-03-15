import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: 'job_complete' | 'purchase_made' | 'sale_made' | 'job_failed' | 'system';
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
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      setNotifications(prev =>
        prev.map(n => (n.read ? n : { ...n, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [supabase, notifications]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel: RealtimeChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, supabase]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}