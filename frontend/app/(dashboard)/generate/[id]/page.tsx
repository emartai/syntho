'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Info, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { JobProgress } from '@/components/shared/JobProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingOverlay } from '@/components/shared/OnboardingOverlay';

const METHODS = [
  {
    label: 'Gaussian Copula',
    value: 'gaussian_copula',
    badge: 'Fast · Statistical',
    locked: false,
  },
  {
    label: 'CTGAN (Deep Learning)',
    value: 'ctgan',
    badge: 'Accurate · GPU-powered',
    locked: true,
  },
] as const;

function estimateCtganMinutes(rows: number, epochs: number) {
  const base = 5;
  const rowFactor = Math.max(0, rows - 10_000) / 10_000;
  const epochFactor = (epochs - 100) / 100;
  return Math.min(15, Math.max(5, Math.round(base + rowFactor * 1.2 + epochFactor * 2.2)));
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
}

export default function GenerateConfigPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const datasetId = params.id;
  const { profile } = useAuth();
  const onboarding = useOnboarding();

  const isFreePlan = (profile?.plan ?? 'free') === 'free';

  const [method, setMethod] = useState<'gaussian_copula' | 'ctgan'>('gaussian_copula');
  const [numRows, setNumRows] = useState<number | ''>('');
  const [epochs, setEpochs] = useState(300);
  const [batchSize, setBatchSize] = useState(500);
  const [syntheticDatasetId, setSyntheticDatasetId] = useState<string | undefined>();
  const [jobStartTimeMs, setJobStartTimeMs] = useState<number | undefined>();

  const datasetQuery = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async () => {
      const response = await api.datasets.get(datasetId);
      return response.data;
    },
  });

  const inferredRows = useMemo(() => datasetQuery.data?.row_count ?? 0, [datasetQuery.data]);
  const requestedRows = Number(numRows || inferredRows);
  const effectiveRows = isFreePlan ? Math.min(requestedRows, 10_000) : requestedRows;

  const estimatedMinutes = useMemo(
    () => estimateCtganMinutes(effectiveRows, epochs),
    [effectiveRows, epochs]
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dataset_id: datasetId,
        method,
        num_rows: effectiveRows,
        config: {
          num_rows: effectiveRows,
          is_free_plan: isFreePlan,
          ...(method === 'ctgan' ? { epochs, batch_size: batchSize } : {}),
        },
      };
      const response = await api.synthetic.generate(payload);
      return response.data;
    },
    onSuccess: (data) => {
      setSyntheticDatasetId(data.id);
      const startedAt = Date.now();
      setJobStartTimeMs(startedAt);
      localStorage.setItem(`job-start-${data.id}`, String(startedAt));
      toast.success('Generation started', {
        description: 'Synthetic job is running. Progress will update in real-time.',
      });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail || error.message;

      if (status === 402) {
        toast.error('Upgrade required', {
          description: typeof detail === 'string' ? detail : detail?.message,
        });
      } else {
        toast.error('Failed to start generation', {
          description: typeof detail === 'string' ? detail : JSON.stringify(detail),
        });
      }
    },
  });



  useEffect(() => {
    if (!datasetQuery.isError || syntheticDatasetId) return;

    api.synthetic
      .getStatus(datasetId)
      .then((response) => {
        if (!response?.data?.id) return;
        setSyntheticDatasetId(response.data.id);
        const saved = localStorage.getItem(`job-start-${response.data.id}`);
        if (saved) {
          const parsed = Number(saved);
          if (Number.isFinite(parsed)) setJobStartTimeMs(parsed);
        }
      })
      .catch(() => {
        // not a synthetic id; keep standard error state
      });
  }, [datasetId, datasetQuery.isError, syntheticDatasetId]);

  useEffect(() => {
    if (!syntheticDatasetId) return;
    const saved = localStorage.getItem(`job-start-${syntheticDatasetId}`);
    if (saved) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed)) setJobStartTimeMs(parsed);
    }
  }, [syntheticDatasetId]);

  const handleComplete = (syntheticId: string) => {
    localStorage.removeItem(`job-start-${syntheticId}`);
    toast.success('Your synthetic dataset is ready!', {
      action: {
        label: 'View Results',
        onClick: () => router.push(`/datasets/${syntheticId}`),
      },
    });
    router.push(`/datasets/${syntheticId}`);
  };

  if (datasetQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }


  if (syntheticDatasetId) {
    return (
      <div className="fixed inset-0 z-40 bg-[#05030f] flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Generating Synthetic Dataset</CardTitle>
            </CardHeader>
            <CardContent>
              <JobProgress
                syntheticDatasetId={syntheticDatasetId}
                onComplete={handleComplete}
                jobStartTimeMs={jobStartTimeMs}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (datasetQuery.isError || !datasetQuery.data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-red-400">Failed to load dataset information.</CardContent>
      </Card>
    );
  }

  const dataset = datasetQuery.data;
  const schemaColumns = dataset.schema?.columns || [];

  const topTypes = Object.entries(
    schemaColumns.reduce((acc: Record<string, number>, col: any) => {
      const t = col?.data_type || 'unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Synthetic Dataset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-2">
          <p><span className="text-text font-semibold">Name:</span> {dataset.name}</p>
          <p><span className="text-text font-semibold">Rows:</span> {dataset.row_count?.toLocaleString()}</p>
          <p><span className="text-text font-semibold">Columns:</span> {dataset.column_count}</p>
          <p><span className="text-text font-semibold">File size:</span> {formatBytes(dataset.file_size || 0)}</p>
          <p>
            <span className="text-text font-semibold">Top column types:</span>{' '}
            {topTypes.map(([t, count]) => `${t} (${count})`).join(', ') || 'N/A'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Generation Method</Label>
            <div className="grid sm:grid-cols-2 gap-3">
              {METHODS.map((option) => {
                const isLocked = option.value === 'ctgan' && isFreePlan;
                const isSelected = method === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    title={isLocked ? 'Upgrade to Pro to use CTGAN' : option.label}
                    onClick={() => {
                      if (isLocked) return;
                      setMethod(option.value);
                    }}
                    className={`rounded-lg border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-surface-2 text-text'
                        : 'border-border text-text-2 hover:border-border-2'
                    } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-text">{option.label}</span>
                      {isLocked && <Lock className="h-4 w-4 text-amber-400" />}
                    </div>
                    <div className="mt-1 text-xs text-text-2">{option.badge}</div>
                  </button>
                );
              })}
            </div>
            {isFreePlan && (
              <p className="text-xs text-amber-400">Upgrade to Pro to use CTGAN.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numRows">Number of rows to generate</Label>
            <Input
              id="numRows"
              type="number"
              min={1}
              max={isFreePlan ? 10_000 : undefined}
              value={numRows}
              placeholder={String(inferredRows)}
              onChange={(e) => {
                const raw = e.target.value ? Number(e.target.value) : '';
                if (raw === '') {
                  setNumRows('');
                  return;
                }
                setNumRows(isFreePlan ? Math.min(raw, 10_000) : raw);
              }}
            />
            {isFreePlan && <p className="text-xs text-text-3">Free plan max is 10,000 rows.</p>}
          </div>

          {method === 'ctgan' && !isFreePlan && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-start gap-2 rounded-md border border-[rgba(6,182,212,0.25)] bg-[rgba(6,182,212,0.10)] p-3 text-sm text-text">
                <Info className="h-4 w-4 mt-0.5 text-cyan-400" />
                <span>CTGAN uses GPU acceleration — typical runtime: 5–15 min.</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="epochs">Epochs: {epochs}</Label>
                <Input
                  id="epochs"
                  type="range"
                  min={100}
                  max={500}
                  step={10}
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch size</Label>
                <select
                  id="batchSize"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="h-10 rounded-md border border-border bg-transparent px-3 text-sm"
                >
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>

              <p className="text-xs text-text-2">{effectiveRows.toLocaleString()} rows × {epochs} epochs ≈ ~{estimatedMinutes} minutes</p>
            </div>
          )}

          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              'Generate Now'
            )}
          </Button>
        </CardContent>
      </Card>

      {onboarding.ready && onboarding.eligible && onboarding.step === 2 && (
        <OnboardingOverlay
          step={2}
          title="Choose how to generate."
          description="Pick a method and row count, then start generation."
          onNext={() => onboarding.setOnboardingStep(3)}
          onSkip={onboarding.dismiss}
        />
      )}

    </div>
  );
}
