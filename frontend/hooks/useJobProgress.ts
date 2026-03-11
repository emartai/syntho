'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface JobProgressState {
  progress: number;
  status: JobStatus;
  error: string | null;
}

export function useJobProgress(syntheticDatasetId?: string) {
  const [state, setState] = useState<JobProgressState>({
    progress: 0,
    status: 'pending',
    error: null,
  });

  useEffect(() => {
    if (!syntheticDatasetId) {
      return;
    }

    const supabase = createClient();

    const fetchCurrentState = async () => {
      const { data, error } = await supabase
        .from('synthetic_datasets')
        .select('progress,status,error_message')
        .eq('id', syntheticDatasetId)
        .single();

      if (error) {
        setState((prev) => ({ ...prev, error: error.message }));
        return;
      }

      setState({
        progress: data?.progress ?? 0,
        status: (data?.status ?? 'pending') as JobStatus,
        error: data?.error_message ?? null,
      });
    };

    fetchCurrentState();

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
        (payload) => {
          const row = payload.new as { progress?: number; status?: JobStatus; error_message?: string | null };
          setState({
            progress: row.progress ?? 0,
            status: row.status ?? 'pending',
            error: row.error_message ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syntheticDatasetId]);

  return state;
}
