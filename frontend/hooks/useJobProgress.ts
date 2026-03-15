'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobLog {
  id: string;
  event: string;
  message: string;
  created_at: string;
}

export interface SyntheticDataset {
  id: string;
  progress: number;
  status: JobStatus;
  error_message: string | null;
  original_dataset_id: string;
  generation_method: string;
  row_count?: number;
  created_at: string;
  updated_at?: string;
}

interface JobProgressState {
  progress: number;
  status: JobStatus;
  syntheticDataset: SyntheticDataset | null;
  error: string | null;
  logs: JobLog[];
}

const POLL_INTERVAL = 5000;
const RECONNECT_DELAY = 3000;

export function useJobProgress(syntheticDatasetId?: string) {
  const [state, setState] = useState<JobProgressState>({
    progress: 0,
    status: 'pending',
    syntheticDataset: null,
    error: null,
    logs: [],
  });

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const fetchJobState = useCallback(async () => {
    if (!syntheticDatasetId || isUnmountedRef.current) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('synthetic_datasets')
        .select('*')
        .eq('id', syntheticDatasetId)
        .single();

      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
        return;
      }

      setState(prev => ({
        ...prev,
        progress: data?.progress ?? 0,
        status: (data?.status ?? 'pending') as JobStatus,
        syntheticDataset: data as SyntheticDataset,
        error: data?.error_message ?? null,
      }));
    } catch (err) {
      console.error('Error fetching job state:', err);
    }
  }, [syntheticDatasetId]);

  const fetchJobLogs = useCallback(async () => {
    if (!syntheticDatasetId || isUnmountedRef.current) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('job_logs')
        .select('*')
        .eq('synthetic_dataset_id', syntheticDatasetId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setState(prev => ({ ...prev, logs: data as JobLog[] }));
      }
    } catch (err) {
      console.error('Error fetching job logs:', err);
    }
  }, [syntheticDatasetId]);

  const setupRealtime = useCallback(() => {
    if (!syntheticDatasetId || isUnmountedRef.current) return;

    const supabase = createClient();

    const handleUpdate = (payload: { new: SyntheticDataset }) => {
      const row = payload.new;
      setState(prev => ({
        ...prev,
        progress: row.progress ?? 0,
        status: (row.status ?? 'pending') as JobStatus,
        syntheticDataset: row,
        error: row.error_message ?? null,
      }));
    };

    const channel = supabase
      .channel(`synthetic-datasets-${syntheticDatasetId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'synthetic_datasets',
          filter: `id=eq.${syntheticDatasetId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_logs',
          filter: `synthetic_dataset_id=eq.${syntheticDatasetId}`,
        },
        (payload) => {
          setState(prev => ({
            ...prev,
            logs: [...prev.logs, payload.new as JobLog],
          }));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchJobState();
          fetchJobLogs();
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          if (!isUnmountedRef.current) {
            reconnectTimerRef.current = setTimeout(setupRealtime, RECONNECT_DELAY);
          }
        }
      });

    channelRef.current = channel;
  }, [syntheticDatasetId, fetchJobState, fetchJobLogs]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;

    pollTimerRef.current = setInterval(() => {
      fetchJobState();
      fetchJobLogs();
    }, POLL_INTERVAL);
  }, [fetchJobState, fetchJobLogs]);

  useEffect(() => {
    isUnmountedRef.current = false;

    if (!syntheticDatasetId) {
      return;
    }

    setupRealtime();
    startPolling();

    return () => {
      isUnmountedRef.current = true;

      if (channelRef.current) {
        createClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [syntheticDatasetId, setupRealtime, startPolling]);

  return state;
}
