'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { JobProgress } from '@/components/shared/JobProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useJobProgress } from '@/hooks/useJobProgress';
import { toast } from 'sonner';

const METHODS = [
  { label: 'Statistical Mimicry (SDV)', value: 'gaussian_copula' },
  { label: 'GAN-based (CTGAN)', value: 'ctgan' },
] as const;

export default function GenerateConfigPage() {
  const params = useParams<{ id: string }>();
  const datasetId = params.id;

  const [method, setMethod] = useState<'gaussian_copula' | 'ctgan'>('gaussian_copula');
  const [numRows, setNumRows] = useState<number | ''>('');
  const [syntheticDatasetId, setSyntheticDatasetId] = useState<string | undefined>();

  const progressState = useJobProgress(syntheticDatasetId);

  const datasetQuery = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: async () => {
      const response = await api.datasets.get(datasetId);
      return response.data;
    },
  });

  const inferredRows = useMemo(() => datasetQuery.data?.row_count ?? 0, [datasetQuery.data]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dataset_id: datasetId,
        method,
        config: {
          num_rows: Number(numRows || inferredRows),
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
      toast.error('Failed to start generation', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

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
        <CardContent className="pt-6 text-sm text-red-400">
          Failed to load dataset information.
        </CardContent>
      </Card>
    );
  }

  const dataset = datasetQuery.data;
  const schemaColumns = dataset.schema?.columns || [];

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
          <div>
            <p className="text-text font-semibold mb-2">Schema</p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {schemaColumns.map((column: any) => (
                <div key={column.name} className="rounded-md border border-border px-3 py-2">
                  <span className="text-text">{column.name}</span>
                  <span className="text-text-2"> · {column.data_type}</span>
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

      {syntheticDatasetId && (
        <Card>
          <CardHeader>
            <CardTitle>Job Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <JobProgress
              jobId={syntheticDatasetId}
              status={progressState.status}
              progress={progressState.progress}
            />
            {progressState.error && <p className="text-xs text-red-400 mt-2">{progressState.error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
