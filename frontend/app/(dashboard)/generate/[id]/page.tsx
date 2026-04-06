'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { JobProgress } from '@/components/shared/JobProgress';
import { UpgradeModal } from '@/components/shared/UpgradeModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const METHODS = [
  { label: 'Statistical Mimicry (SDV)', value: 'gaussian_copula' },
  { label: 'GAN-based (CTGAN)', value: 'ctgan' },
] as const;

function estimateCtganMinutes(rows: number, epochs: number) {
  const base = 5;
  const rowFactor = Math.max(0, rows - 10_000) / 10_000;
  const epochFactor = (epochs - 100) / 100;
  return Math.min(15, Math.max(5, Math.round(base + rowFactor * 1.2 + epochFactor * 2.2)));
}

export default function GenerateConfigPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const datasetId = params.id;

  const [method, setMethod] = useState<'gaussian_copula' | 'ctgan'>('gaussian_copula');
  const [numRows, setNumRows] = useState<number | ''>('');
  const [epochs, setEpochs] = useState(300);
  const [batchSize, setBatchSize] = useState(500);
  const [syntheticDatasetId, setSyntheticDatasetId] = useState<string | undefined>();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeDescription, setUpgradeDescription] = useState('This feature requires a paid plan.');

  const datasetQuery = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async () => {
      const response = await api.datasets.get(datasetId);
      return response.data;
    },
  });

  const inferredRows = useMemo(() => datasetQuery.data?.row_count ?? 0, [datasetQuery.data]);
  const estimatedMinutes = useMemo(
    () => estimateCtganMinutes(Number(numRows || inferredRows), epochs),
    [numRows, inferredRows, epochs]
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dataset_id: datasetId,
        method,
        config: {
          num_rows: Number(numRows || inferredRows),
          ...(method === 'ctgan' ? { epochs, batch_size: batchSize } : {}),
        },
      };
      const response = await api.synthetic.generate(payload);
      return response.data;
    },
    onSuccess: (data) => {
      setSyntheticDatasetId(data.id);
      toast.success('Generation started', {
        description: 'Synthetic job is running. Progress will update in real-time.',
      });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail || error.message;

      if (status === 503 || status === 502) {
        toast.error('ML service unavailable', {
          description: 'The ML service is temporarily unavailable. Please try again in a few minutes.',
        });
      } else if (detail?.toLowerCase?.().includes('gpu') || detail?.toLowerCase?.().includes('quota')) {
        toast.error('GPU quota exceeded', {
          description: 'The ML service GPU quota has been reached. Please try again later or contact support.',
        });
      } else if (status === 402) {
        setUpgradeDescription(typeof detail === 'string' ? detail : 'Upgrade your plan to continue with this action.');
        setUpgradeOpen(true);
      } else if (status === 504 || error?.code === 'ECONNABORTED') {
        toast.error('Request timed out', {
          description: 'The ML service took too long to respond. Please try again.',
        });
      } else {
        toast.error('Failed to start generation', {
          description: detail,
        });
      }
    },
  });

  const handleComplete = (syntheticId: string) => {
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

  if (datasetQuery.isError || !datasetQuery.data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-red-400">Failed to load dataset information.</CardContent>
      </Card>
    );
  }

  const dataset = datasetQuery.data;
  const schemaColumns = dataset.schema?.columns || [];

  if (syntheticDatasetId) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Generating Synthetic Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <JobProgress syntheticDatasetId={syntheticDatasetId} onComplete={handleComplete} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title="Plan upgrade required"
        description={upgradeDescription}
      />

      <Card>
        <CardHeader>
          <CardTitle>Generate Synthetic Dataset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-2">
          <p><span className="text-text font-semibold">Name:</span> {dataset.name}</p>
          <p><span className="text-text font-semibold">Rows:</span> {dataset.row_count?.toLocaleString()}</p>
          <p><span className="text-text font-semibold">Columns:</span> {dataset.column_count}</p>
          <div>
            <p className="text-text font-semibold mb-2">Schema</p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {schemaColumns.map((column: any) => (
                <div key={column.name} className="rounded-md border border-border px-3 py-2">
                  <span className="text-text">{column.name}</span>
                  <span className="text-text-2"> {' · '}{column.data_type}</span>
                </div>
              ))}
            </div>
          </div>
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
              {METHODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMethod(option.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-all ${
                    method === option.value
                      ? 'border-primary bg-surface-2 text-text'
                      : 'border-border text-text-2 hover:border-border-2'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numRows">Number of rows to generate</Label>
            <Input
              id="numRows"
              type="number"
              min={1}
              value={numRows}
              placeholder={String(inferredRows)}
              onChange={(e) => setNumRows(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          {method === 'ctgan' && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-start gap-2 rounded-md border border-[rgba(6,182,212,0.25)] bg-[rgba(6,182,212,0.10)] p-3 text-sm text-text">
                <Info className="h-4 w-4 mt-0.5 text-cyan-400" />
                <span>CTGAN uses GPU acceleration and typically takes 5-15 minutes.</span>
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
                <Input
                  id="batchSize"
                  type="number"
                  min={50}
                  step={50}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value || 500)))}
                />
              </div>

              <p className="text-xs text-text-2">Estimated CTGAN runtime: ~{estimatedMinutes} minutes.</p>
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
    </div>
  );
}
