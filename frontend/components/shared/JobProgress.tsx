'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Clock, FileText, X } from 'lucide-react';

import { api } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { JobLog, useJobProgress } from '@/hooks/useJobProgress';

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface JobProgressProps {
  syntheticDatasetId: string;
  onComplete?: (syntheticId: string) => void;
}

const STEPS = [
  { key: 'uploading', label: 'Uploading', icon: '✅' },
  { key: 'detecting_schema', label: 'Detecting Schema', icon: '✅' },
  { key: 'training_model', label: 'Training Model', icon: '⏳' },
  { key: 'generating_data', label: 'Generating Data', icon: '⏳' },
  { key: 'scoring_privacy', label: 'Scoring Privacy', icon: '⏳' },
  { key: 'validating_correlations', label: 'Validating Correlations', icon: '⏳' },
  { key: 'generating_reports', label: 'Generating Reports', icon: '⏳' },
  { key: 'complete', label: 'Complete', icon: '🎉' },
] as const;

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

function getCurrentStep(progress: number, status: JobStatus): number {
  if (status === 'completed') return STEPS.length - 1;
  if (status === 'failed') return -1;
  if (progress < 5) return 0;
  if (progress < 10) return 1;
  if (progress < 40) return 2;
  if (progress < 65) return 3;
  if (progress < 80) return 4;
  if (progress < 92) return 5;
  if (progress < 100) return 6;
  return 7;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatRemaining(elapsed: number, progress: number): string {
  if (progress <= 0) return '--:--';
  const estimatedTotal = (elapsed / progress) * 100;
  const remaining = Math.max(0, estimatedTotal - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = Math.round(remaining % 60);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function JobProgress({ syntheticDatasetId, onComplete }: JobProgressProps) {
  const { progress, status, syntheticDataset, error, logs } = useJobProgress(syntheticDatasetId);
  const config = statusConfig[status];
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [lastProgress, setLastProgress] = useState(progress);
  const [isStuck, setIsStuck] = useState(false);

  const currentStep = useMemo(() => getCurrentStep(progress, status), [progress, status]);

  // Check for stuck job (no progress for 5 minutes)
  useEffect(() => {
    if (status === 'running') {
      if (progress === lastProgress) {
        const stuckTimer = setTimeout(() => {
          setIsStuck(true);
        }, 5 * 60 * 1000); // 5 minutes
        return () => clearTimeout(stuckTimer);
      } else {
        setLastProgress(progress);
        setIsStuck(false);
      }
    }
  }, [progress, status, lastProgress]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  useEffect(() => {
    if (status === 'completed' && onComplete) {
      const timer = setTimeout(() => onComplete(syntheticDatasetId), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, syntheticDatasetId, onComplete]);

  useEffect(() => {
    if (status === 'completed') {
      const countdownTimer = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(countdownTimer);
    }
  }, [status]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await api.synthetic.cancel(syntheticDatasetId);
    } catch {
      // Cancel failed - job will remain in current state
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span
          style={{
            background: config.bgColor,
            color: config.color,
            border: `1px solid ${config.borderColor}`,
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Satoshi, sans-serif',
            display: 'inline-block',
          }}
        >
          {config.label}
        </span>
        <div className="flex items-center gap-4 text-xs text-[rgba(241,240,255,0.65)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Elapsed: {formatElapsed(elapsed)}
          </span>
          {status === 'running' && (
            <span>Est. remaining: {formatRemaining(elapsed, progress)}</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="relative h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[rgba(241,240,255,0.38)]">
          <span>{progress < 100 ? `Step ${currentStep + 1} of ${STEPS.length}` : 'Done'}</span>
          <span>{progress}%</span>
        </div>
      </div>

      <div className="space-y-2">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep && status === 'running';
          const isCompleted = index < currentStep || (status === 'completed' && index < STEPS.length - 1);
          const isPending = index > currentStep && status !== 'completed';

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isActive ? 'bg-[rgba(6,182,212,0.10)] border border-[rgba(6,182,212,0.25)]' : 'opacity-60'
              }`}
            >
              <span className="text-sm">{isCompleted ? '✅' : isActive ? '🔄' : step.icon}</span>
              <span className={`text-sm ${isActive ? 'text-cyan-400 font-medium' : isCompleted ? 'text-[rgba(241,240,255,0.65)]' : 'text-[rgba(241,240,255,0.38)]'}`}>
                {step.label}
              </span>
              {isActive && (
                <span className="ml-auto text-xs text-cyan-400 animate-pulse">In progress...</span>
              )}
            </div>
          );
        })}
      </div>

      {logs.length > 0 && (
        <div className="border border-[rgba(167,139,250,0.10)] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between px-4 py-2 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
          >
            <span className="text-sm text-[rgba(241,240,255,0.65)] flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Job Logs ({logs.length})
            </span>
            {showLogs ? <ChevronUp className="h-4 w-4 text-[rgba(241,240,255,0.38)]" /> : <ChevronDown className="h-4 w-4 text-[rgba(241,240,255,0.38)]" />}
          </button>
          {showLogs && (
            <div className="max-h-48 overflow-y-auto p-4 bg-[rgba(0,0,0,0.2)] space-y-1">
              {logs.map((log: JobLog) => (
                <div key={log.id} className="text-xs text-[rgba(241,240,255,0.65)] font-mono">
                  <span className="text-[rgba(241,240,255,0.38)]">[{formatTimestamp(log.created_at)}]</span>{' '}
                  <span className="text-primary">{log.event}</span>: {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.25)]">
          <p className="text-sm text-red-400">Error: {error}</p>
        </div>
      )}

      {isStuck && (
        <div className="p-4 rounded-lg bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.25)]">
          <p className="text-sm text-amber-400 font-medium mb-2">
            Job may be stuck — no progress for 5+ minutes
          </p>
          <p className="text-xs text-[rgba(241,240,255,0.65)] mb-3">
            The ML service might be experiencing issues. You can cancel and try again.
          </p>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full border-[rgba(245,158,11,0.25)] text-amber-400 hover:bg-[rgba(245,158,11,0.10)]"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel Job
          </Button>
        </div>
      )}

      {status === 'running' && !isStuck && (
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-full border-[rgba(239,68,68,0.25)] text-red-400 hover:bg-[rgba(239,68,68,0.10)]"
        >
          <X className="h-4 w-4 mr-2" />
          {isCancelling ? 'Cancelling...' : 'Cancel Generation'}
        </Button>
      )}

      {status === 'completed' && (
        <div className="text-center space-y-4">
          <div className="p-4 rounded-lg bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.25)]">
            <p className="text-sm text-green-400">Your synthetic dataset is ready!</p>
            {countdown > 0 && (
              <p className="text-xs text-[rgba(241,240,255,0.38)] mt-1">Redirecting in {countdown}s...</p>
            )}
          </div>
          <Button asChild className="w-full">
            <Link href={`/datasets/${syntheticDatasetId}`}>View Results</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
