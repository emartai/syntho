'use client';

import { useMemo } from 'react';

import { DistributionChart } from '@/components/charts/DistributionChart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type NullableNumber = number | null;

interface ColumnStats {
  mean: NullableNumber;
  median: NullableNumber;
  std: NullableNumber;
  min: NullableNumber;
  max: NullableNumber;
  null_pct: number;
  top_values: Array<{ value: string; count: number }>;
}

interface QualityColumn {
  column: string;
  type: 'numeric' | 'categorical';
  original_stats: ColumnStats;
  synthetic_stats: ColumnStats;
  distribution_data: Array<{ label: string; original: number; synthetic: number }>;
  drift_score: number;
}

interface QualityComparisonReportProps {
  report: {
    overall_score?: number;
    correlation_score?: number;
    column_stats?: {
      columns?: QualityColumn[];
      overall_fidelity_score?: number;
    };
  } | null;
  originalRowCount: number | null;
  syntheticRowCount: number | null;
  originalColumnCount: number | null;
}

function formatValue(value: NullableNumber | number | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return Number(value).toFixed(4);
}

function driftBadge(score: number) {
  if (score < 0.2) {
    return <Badge variant="default">Low Drift</Badge>;
  }
  if (score < 0.5) {
    return <Badge variant="default">Medium Drift</Badge>;
  }
  return <Badge variant="destructive">High Drift</Badge>;
}

export function QualityComparisonReport({
  report,
  originalRowCount,
  syntheticRowCount,
  originalColumnCount,
}: QualityComparisonReportProps) {
  if (!report?.column_stats?.columns?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-2">Quality comparison data is not available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const columns = report.column_stats.columns;
  const fidelity = report.column_stats.overall_fidelity_score ?? (report.overall_score ?? 0) / 100;

  const csvHref = useMemo(() => {
    const headers = [
      'Column Name',
      'Type',
      'Original Mean',
      'Synthetic Mean',
      'Original Std',
      'Synthetic Std',
      'Drift Score',
    ];

    const rows = columns.map((column) => [
      column.column,
      column.type,
      formatValue(column.original_stats.mean),
      formatValue(column.synthetic_stats.mean),
      formatValue(column.original_stats.std),
      formatValue(column.synthetic_stats.std),
      column.drift_score.toFixed(4),
    ]);

    const csvText = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    return `data:text/csv;charset=utf-8,${encodeURIComponent(csvText)}`;
  }, [columns]);

  const fidelityPercent = fidelity * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quality Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-btn border border-border p-3">
            <p className="text-xs text-text-3">Fidelity Score</p>
            <p
              className="text-3xl font-bold"
              style={{ color: fidelityPercent >= 80 ? '#22c55e' : fidelityPercent >= 60 ? '#f59e0b' : '#ef4444' }}
            >
              {fidelityPercent.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-btn border border-border p-3">
            <p className="text-xs text-text-3">Correlation Score</p>
            <p className="text-xl font-semibold text-text">{formatValue(report.correlation_score)}%</p>
          </div>
          <div className="rounded-btn border border-border p-3">
            <p className="text-xs text-text-3">Rows (Original vs Synthetic)</p>
            <p className="text-xl font-semibold text-text">{originalRowCount ?? '—'} / {syntheticRowCount ?? '—'}</p>
          </div>
          <div className="rounded-btn border border-border p-3">
            <p className="text-xs text-text-3">Column Count</p>
            <p className="text-xl font-semibold text-text">{originalColumnCount ?? columns.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Statistical Summary</CardTitle>
          <Button asChild>
            <a href={csvHref} download="quality-report.csv">
              Download Quality Report CSV
            </a>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-3">
                <th className="py-2 pr-4">Column Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Original Mean</th>
                <th className="py-2 pr-4">Synthetic Mean</th>
                <th className="py-2 pr-4">Original Std</th>
                <th className="py-2 pr-4">Synthetic Std</th>
                <th className="py-2 pr-4">Drift Score</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => (
                <tr key={`summary-${column.column}`} className="border-b border-border/60">
                  <td className="py-2 pr-4 text-text">{column.column}</td>
                  <td className="py-2 pr-4 text-text-2">{column.type}</td>
                  <td className="py-2 pr-4 text-text-2">{formatValue(column.original_stats.mean)}</td>
                  <td className="py-2 pr-4 text-text-2">{formatValue(column.synthetic_stats.mean)}</td>
                  <td className="py-2 pr-4 text-text-2">{formatValue(column.original_stats.std)}</td>
                  <td className="py-2 pr-4 text-text-2">{formatValue(column.synthetic_stats.std)}</td>
                  <td className="py-2 pr-4 text-text-2">{column.drift_score.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {columns.map((column) => (
        <Card key={column.column}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{column.column}</CardTitle>
            {driftBadge(column.drift_score)}
          </CardHeader>
          <CardContent className="space-y-4">
            <DistributionChart columnName={column.column} data={column.distribution_data} type={column.type} />
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-text-3">
                    <th className="py-2 pr-4">Metric</th>
                    <th className="py-2 pr-4">Original</th>
                    <th className="py-2 pr-4">Synthetic</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Mean', formatValue(column.original_stats.mean), formatValue(column.synthetic_stats.mean)],
                    ['Median', formatValue(column.original_stats.median), formatValue(column.synthetic_stats.median)],
                    ['Std', formatValue(column.original_stats.std), formatValue(column.synthetic_stats.std)],
                    ['Min', formatValue(column.original_stats.min), formatValue(column.synthetic_stats.min)],
                    ['Max', formatValue(column.original_stats.max), formatValue(column.synthetic_stats.max)],
                    ['Null %', `${column.original_stats.null_pct.toFixed(2)}%`, `${column.synthetic_stats.null_pct.toFixed(2)}%`],
                  ].map((row) => (
                    <tr key={`${column.column}-${row[0]}`} className="border-b border-border/60">
                      <td className="py-2 pr-4 text-text">{row[0]}</td>
                      <td className="py-2 pr-4 text-text-2">{row[1]}</td>
                      <td className="py-2 pr-4 text-text-2">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
