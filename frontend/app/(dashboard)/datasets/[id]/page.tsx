'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileText, Play, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { DistributionChart } from '@/components/charts/DistributionChart';
import { TrustScore } from '@/components/reports/TrustScore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, downloadCompliancePDF, downloadSynthetic, getDataset } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

function ScorePill({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="rounded-xl border border-[rgba(167,139,250,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[rgba(241,240,255,0.45)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text">{value ?? 'N/A'}</p>
    </div>
  );
}

function getComplianceScore(complianceReport: any) {
  if (!complianceReport) return 0;
  if (complianceReport.passed) return 100;
  if (complianceReport.gdpr_passed || complianceReport.hipaa_passed) return 75;
  return 50;
}

function statusTone(passed: boolean | undefined) {
  return passed ? 'text-green-400' : 'text-red-400';
}

export default function DatasetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState<'gaussian_copula' | 'ctgan'>('gaussian_copula');
  const [numRows, setNumRows] = useState<number | ''>('');

  const datasetQuery = useQuery({
    queryKey: ['dataset-detail', params.id],
    queryFn: () => getDataset(params.id),
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: { dataset_id: string; method: 'gaussian_copula' | 'ctgan'; config: { num_rows?: number } }) => {
      return api.synthetic.generate(payload);
    },
    onSuccess: async (response) => {
      toast.success('Generation started');
      await queryClient.invalidateQueries({ queryKey: ['dataset-detail', params.id] });
      router.push(`/generate/${params.id}`);
    },
    onError: (error: any) => {
      toast.error('Failed to start generation', {
        description: error?.response?.data?.detail?.message || error?.response?.data?.detail || error?.message,
      });
    },
  });

  const data = datasetQuery.data;

  const qualityColumns = useMemo(() => {
    const columns = data?.quality_report?.column_stats?.columns || [];
    return Array.isArray(columns) ? columns : [];
  }, [data]);

  const correlationOriginal = data?.quality_report?.column_stats?.correlation_matrices?.original || {};
  const correlationSynthetic = data?.quality_report?.column_stats?.correlation_matrices?.synthetic || {};

  if (datasetQuery.isLoading) {
    return <div className="py-16 text-center text-sm text-[rgba(241,240,255,0.45)]">Loading dataset…</div>;
  }

  if (datasetQuery.isError || !data) {
    return <div className="py-16 text-center text-sm text-red-400">Failed to load dataset details.</div>;
  }

  if (data.type === 'original') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{data.name}</h1>
            <p className="mt-1 text-sm text-[rgba(241,240,255,0.55)]">
              {data.file_type?.toUpperCase()} · {Number(data.row_count || 0).toLocaleString()} rows · {data.column_count} columns
            </p>
          </div>
          <Button asChild>
            <Link href={`/generate/${data.id}`}>Generate New Synthetic</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <ScorePill label="Status" value={data.status} />
          <ScorePill label="Rows" value={Number(data.row_count || 0).toLocaleString()} />
          <ScorePill label="Columns" value={data.column_count} />
          <ScorePill label="Uploaded" value={data.created_at ? format(new Date(data.created_at), 'MMM d, yyyy') : 'N/A'} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Schema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.schema?.columns || []).map((column: any) => (
              <div key={column.name} className="grid gap-2 rounded-xl border border-[rgba(167,139,250,0.12)] p-4 md:grid-cols-4">
                <div>
                  <p className="text-sm font-medium text-text">{column.name}</p>
                  <p className="text-xs text-[rgba(241,240,255,0.45)]">{column.data_type}</p>
                </div>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">Nulls: {column.null_percentage}%</p>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">Unique: {column.unique_count}</p>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">
                  Samples: {(column.sample_values || []).slice(0, 2).join(', ') || 'N/A'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Generate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <select
                  id="method"
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value as 'gaussian_copula' | 'ctgan')}
                  className="w-full rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white"
                >
                  <option value="gaussian_copula">Gaussian Copula</option>
                  <option value="ctgan" disabled={profile?.plan === 'free'}>
                    CTGAN {profile?.plan === 'free' ? '(Pro required)' : ''}
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numRows">Rows to generate</Label>
                <Input
                  id="numRows"
                  type="number"
                  value={numRows}
                  onChange={(e) => setNumRows(e.target.value ? Number(e.target.value) : '')}
                  placeholder={String(data.row_count || 0)}
                />
              </div>
            </div>
            <Button
              onClick={() =>
                generateMutation.mutate({
                  dataset_id: data.id,
                  method: selectedMethod,
                  config: { num_rows: Number(numRows || data.row_count || 0) },
                })
              }
              disabled={generateMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Generate Synthetic Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Synthetic Generations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.synthetic_versions?.length ? (
              data.synthetic_versions.map((item: any) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-[rgba(167,139,250,0.12)] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">{item.generation_method}</p>
                    <p className="text-xs text-[rgba(241,240,255,0.45)]">
                      {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : 'Unknown'} · {item.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/datasets/${item.id}`}>View</Link>
                    </Button>
                    {item.status === 'completed' ? (
                      <Button variant="outline" onClick={() => downloadSynthetic(item.id).then((url) => window.open(url, '_blank'))}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[rgba(241,240,255,0.45)]">No synthetic generations yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const trustScore = data.trust_score;
  const privacyScore = data.privacy_score;
  const qualityReport = data.quality_report;
  const complianceReport = data.compliance_report;
  const findings = complianceReport?.findings?.issues || [];
  const passedChecks = [
    { label: 'GDPR', passed: complianceReport?.gdpr_passed },
    { label: 'HIPAA', passed: complianceReport?.hipaa_passed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href={`/datasets/${data.original_dataset?.id}`} className="text-sm text-primary hover:text-primary/80">
            Back to original dataset
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-text">Synthetic Dataset Result</h1>
          <p className="mt-1 text-sm text-[rgba(241,240,255,0.55)]">
            {data.generation_method} · {Number(data.row_count || 0).toLocaleString()} rows
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadCompliancePDF(data.id)}>
            <FileText className="mr-2 h-4 w-4" />
            Download Compliance PDF
          </Button>
          <Button variant="outline" onClick={() => downloadSynthetic(data.id).then((url) => window.open(url, '_blank'))}>
            <Download className="mr-2 h-4 w-4" />
            Download Synthetic Data
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trust Score</CardTitle>
        </CardHeader>
        <CardContent>
          <TrustScore
            composite_score={Number(trustScore?.composite_score || 0)}
            privacy_score={Number(privacyScore?.overall_score || 0)}
            fidelity_score={Number(qualityReport?.overall_score || 0)}
            compliance_score={getComplianceScore(complianceReport)}
            label={trustScore?.label || 'N/A'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What This Means</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-[rgba(241,240,255,0.65)]">
            This synthetic dataset keeps the important structure of your original data while reducing privacy risk.
            The trust score combines privacy, fidelity, and compliance into one launch-ready signal for sharing and internal review.
          </p>
          <div className="flex flex-wrap gap-4">
            {passedChecks.map((check) => (
              <div key={check.label} className={`flex items-center gap-2 text-sm ${statusTone(Boolean(check.passed))}`}>
                {check.passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{check.label}: {check.passed ? 'Passed' : 'Failed'}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-text">
              <Shield className="h-4 w-4 text-primary" />
              <span>PII Risk: {privacyScore?.risk_level || 'unknown'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScorePill label="Risk Level" value={privacyScore?.risk_level} />
          <div className="flex flex-wrap gap-2">
            {privacyScore?.pii_detected && Object.keys(privacyScore.pii_detected).length ? (
              Object.entries(privacyScore.pii_detected).map(([column, info]: [string, any]) => (
                <div key={column} className="rounded-full border border-[rgba(167,139,250,0.2)] px-3 py-1 text-sm text-text">
                  {column}: {(info?.entities || []).join(', ') || 'PII detected'}
                </div>
              ))
            ) : (
              <p className="text-sm text-[rgba(241,240,255,0.45)]">No PII columns detected in the latest scan.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fidelity Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <ScorePill label="Correlation Score" value={qualityReport?.correlation_score} />
            <ScorePill label="Distribution Score" value={qualityReport?.distribution_score} />
          </div>
          <CorrelationHeatmap original={correlationOriginal} synthetic={correlationSynthetic} />
          {qualityColumns.length ? (
            <div className="space-y-6">
              {qualityColumns.slice(0, 4).map((column: any) => (
                <div key={column.column}>
                  <h3 className="mb-3 text-sm font-medium text-text">{column.column}</h3>
                  <DistributionChart
                    columnName={column.column}
                    data={Array.isArray(column.distribution_data) ? column.distribution_data : []}
                    type={column.type === 'numeric' ? 'numeric' : 'categorical'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[rgba(241,240,255,0.45)]">No distribution data available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {findings.length ? (
            findings.map((finding: string, index: number) => (
              <div key={`${finding}-${index}`} className="rounded-xl border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.06)] p-4 text-sm text-[rgba(241,240,255,0.75)]">
                {finding}
              </div>
            ))
          ) : (
            <p className="text-sm text-[rgba(241,240,255,0.45)]">No major compliance issues were recorded in the latest report.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <ScorePill label="Method" value={data.generation_method} />
          <ScorePill label="Rows Generated" value={Number(data.row_count || 0).toLocaleString()} />
          <ScorePill label="Created" value={data.created_at ? format(new Date(data.created_at), 'MMM d, yyyy') : 'N/A'} />
          <Button asChild className="h-full">
            <Link href={`/generate/${data.original_dataset?.id}`}>Regenerate with Different Settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
