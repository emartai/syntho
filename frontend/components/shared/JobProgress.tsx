'use client';

import { Progress } from '@/components/ui/progress';

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

export function JobProgress({ jobId, status, progress }: JobProgressProps) {
  const config = statusConfig[status];

  return (
    <div className="space-y-3">
      {/* Status badge */}
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
            display: 'inline-block' 
          }}
        >
          {config.label}
        </span>
        {jobId && (
          <span className="text-xs text-[rgba(241,240,255,0.38)] font-mono">
            {jobId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-[rgba(241,240,255,0.38)]">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Pulse indicator for running jobs */}
      {status === 'running' && (
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full bg-[#06b6d4]"
            style={{ 
              animation: 'pulseGlow 1.8s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(6,182,212,0.5)'
            }}
          />
          <span className="text-xs text-[rgba(241,240,255,0.65)]">
            Processing...
          </span>
        </div>
      )}
    </div>
  );
}
