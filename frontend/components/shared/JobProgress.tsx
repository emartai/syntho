'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { api } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface JobProgressProps {
  jobId?: string;
  status: JobStatus;
  progress: number;
}

const statusConfig: Record<JobStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  pending: {
    label: 'Pending',
    color: 'rgba(241,240,255,0.65)',
    bgColor: 'rgba(241,240,255,0.06)',
    borderColor: 'rgba(241,240,255,0.1)',
  },
  running: {
    label: 'Running',
    color: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.10)',
    borderColor: 'rgba(6,182,212,0.25)',
  },
  completed: {
    label: 'Completed',
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.10)',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  failed: {
    label: 'Failed',
    color: '#ef4444',
    bgColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
};

function toStepLabel(progress: number, status: JobStatus) {
  if (status === 'completed') return 'Complete';
  if (progress < 10) return 'Initializing';
  if (progress < 80) return 'Training model';
  if (progress < 92) return 'Generating data';
  return 'Scoring privacy';
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function JobProgress({ jobId, status, progress }: JobProgressProps) {
  const config = statusConfig[status];
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  const stepLabel = useMemo(() => toStepLabel(progress, status), [progress, status]);

  const handleCancel = async () => {
    if (!jobId) return;
    setIsCancelling(true);
    try {
      await api.synthetic.cancel(jobId);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span
          style={{
            background: config.bgColor,
            color: config.color,
            border: `1px solid ${config.borderColor}`,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Satoshi, sans-serif',
            display: 'inline-block',
          }}
        >
          {config.label}
        </span>
        <span className="text-xs text-[rgba(241,240,255,0.65)]">Elapsed: {formatElapsed(elapsed)}</span>
      </div>

      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-[rgba(241,240,255,0.38)]">
          <span>{stepLabel}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {status === 'running' && jobId && (
        <Button variant="outline" onClick={handleCancel} disabled={isCancelling}>
          {isCancelling ? 'Cancelling...' : 'Cancel'}
        </Button>
      )}

      {status === 'completed' && jobId && (
        <Button asChild>
          <Link href={`/datasets/${jobId}`}>View Results</Link>
        </Button>
      )}
    </div>
  );
}
