'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Clock, FileText, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { JobLog, useJobProgress } from '@/hooks/useJobProgress'

type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

interface JobProgressProps {
  syntheticDatasetId: string
  onComplete?: (syntheticId: string) => void
  jobStartTimeMs?: number
}

const STEPS = [
  { key: 'uploaded', label: 'File Uploaded ✓' },
  { key: 'schema', label: 'Schema Detected ✓' },
  { key: 'training', label: 'Training Model' },
  { key: 'generating', label: 'Generating Data' },
  { key: 'privacy', label: 'Scoring Privacy' },
  { key: 'reports', label: 'Generating Reports' },
  { key: 'complete', label: 'Complete' },
] as const

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
}

function getCurrentStep(progress: number, status: JobStatus): number {
  if (status === 'completed') return STEPS.length - 1
  if (status === 'failed') return -1
  if (progress < 8) return 0
  if (progress < 16) return 1
  if (progress < 40) return 2
  if (progress < 62) return 3
  if (progress < 82) return 4
  if (progress < 99) return 5
  return 6
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatRemaining(elapsed: number, progress: number): string {
  if (progress <= 0) return '--:--'
  const estimatedTotal = (elapsed / progress) * 100
  const remaining = Math.max(0, estimatedTotal - elapsed)
  const mins = Math.floor(remaining / 60)
  const secs = Math.round(remaining % 60)
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function JobProgress({ syntheticDatasetId, onComplete, jobStartTimeMs }: JobProgressProps) {
  const { progress, status, syntheticDataset, error, logs } = useJobProgress(syntheticDatasetId)
  const config = statusConfig[status]
  const [startTime] = useState<number>(jobStartTimeMs ?? Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [countdown, setCountdown] = useState(3)

  const currentStep = useMemo(() => getCurrentStep(progress, status), [progress, status])

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startTime])

  useEffect(() => {
    if (status === 'completed' && onComplete) {
      const timer = setTimeout(() => onComplete(syntheticDatasetId), 3000)
      return () => clearTimeout(timer)
    }
  }, [onComplete, status, syntheticDatasetId])

  useEffect(() => {
    if (status === 'completed') {
      const countdownTimer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      return () => clearInterval(countdownTimer)
    }
  }, [status])

  const handleCancel = async () => {
    if (!window.confirm('Cancel this generation job? This cannot be undone.')) return

    setIsCancelling(true)
    try {
      await api.synthetic.cancel(syntheticDatasetId)
    } finally {
      setIsCancelling(false)
    }
  }

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
          {status === 'running' && <span>Est. remaining: {formatRemaining(elapsed, progress)}</span>}
        </div>
      </div>

      <div className="space-y-1">
        <div className="relative h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-violet-400 to-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[rgba(241,240,255,0.38)]">
          <span>{progress < 100 ? `Step ${Math.max(currentStep + 1, 1)} of ${STEPS.length}` : 'Done'}</span>
          <span>{progress}%</span>
        </div>
      </div>

      <div className="space-y-2">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep && status === 'running'
          const isCompleted = index < currentStep || status === 'completed'

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                isActive ? 'border border-[rgba(6,182,212,0.25)] bg-[rgba(6,182,212,0.10)]' : 'opacity-75'
              }`}
            >
              <span className="text-sm">
                {isCompleted ? '✅' : isActive ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : '○'}
              </span>
              <span
                className={`text-sm ${
                  isActive
                    ? 'font-medium text-cyan-400'
                    : isCompleted
                      ? 'text-[rgba(241,240,255,0.75)]'
                      : 'text-[rgba(241,240,255,0.38)]'
                }`}
              >
                {step.label}
              </span>
              {isActive && <span className="ml-auto text-xs text-cyan-300">In progress...</span>}
            </div>
          )
        })}
      </div>

      {logs.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[rgba(167,139,250,0.10)]">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex w-full items-center justify-between bg-[rgba(255,255,255,0.04)] px-4 py-2 transition-colors hover:bg-[rgba(255,255,255,0.07)]"
          >
            <span className="flex items-center gap-2 text-sm text-[rgba(241,240,255,0.65)]">
              <FileText className="h-4 w-4" />
              Job Logs ({logs.length})
            </span>
            {showLogs ? (
              <ChevronUp className="h-4 w-4 text-[rgba(241,240,255,0.38)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[rgba(241,240,255,0.38)]" />
            )}
          </button>
          {showLogs && (
            <div className="max-h-48 space-y-1 overflow-y-auto bg-[rgba(0,0,0,0.2)] p-4">
              {logs.map((log: JobLog) => (
                <div key={log.id} className="font-mono text-xs text-[rgba(241,240,255,0.65)]">
                  <span className="text-[rgba(241,240,255,0.38)]">[{formatTimestamp(log.created_at)}]</span>{' '}
                  <span className="text-primary">{log.event}</span>: {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] p-4">
          <p className="text-sm text-red-400">Error: {error}</p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href={`/generate/${syntheticDataset?.original_dataset_id ?? ''}`}>Try Again</Link>
          </Button>
        </div>
      )}

      {(status === 'running' || status === 'pending') && (
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-full border-[rgba(239,68,68,0.25)] text-red-400 hover:bg-[rgba(239,68,68,0.10)]"
        >
          <X className="mr-2 h-4 w-4" />
          {isCancelling ? 'Cancelling...' : 'Cancel Generation'}
        </Button>
      )}

      {status === 'completed' && (
        <div className="space-y-4 text-center">
          <div className="rounded-lg border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)] p-4">
            <p className="text-sm text-green-400">Your synthetic dataset is ready!</p>
            {countdown > 0 && (
              <p className="mt-1 text-xs text-[rgba(241,240,255,0.38)]">Redirecting in {countdown}s...</p>
            )}
          </div>
          <Button asChild className="w-full">
            <Link href={`/datasets/${syntheticDatasetId}`}>View Results</Link>
          </Button>
        </div>
      )}

      {status === 'failed' && !error && (
        <Button asChild className="w-full" variant="outline">
          <Link href={`/generate/${syntheticDataset?.original_dataset_id ?? ''}`}>Try Again</Link>
        </Button>
      )}
    </div>
  )
}
