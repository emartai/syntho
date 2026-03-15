'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityReport as QualityReportType } from '@/types';

interface QualityReportProps {
  report: QualityReportType | null;
}

type DistributionResult = {
  column: string;
  type: 'numeric' | 'categorical';
  method: string;
  statistic: number;
  p_value: number;
  drift: boolean;
  passed: boolean;
};

export function QualityReport({ report }: QualityReportProps) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-2">No quality report available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const columnStats = report.column_stats ?? {};
  const distribution = (columnStats.distribution ?? []) as DistributionResult[];
  const matrices = (columnStats.correlation_matrices ?? {}) as {
    original?: Record<string, Record<string, number>>;
    synthetic?: Record<string, Record<string, number>>;
  };
  const aiAdvice = columnStats.ai_advice as string | undefined;
  const [showAdvice, setShowAdvice] = useState(false);

  const badgeVariant = report.overall_score >= 85 ? 'success' : report.overall_score >= 70 ? 'warning' : 'danger';

  return (
    <Card className="space-y-5">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Quality Report</CardTitle>
          <Badge variant={report.overall_score >= 70 ? 'default' : 'secondary'}>Overall Score: {report.overall_score.toFixed(1)}</Badge>
        </div>

        <div
          className="flex items-center gap-2 rounded-btn border px-3 py-2 text-sm font-semibold"
          style={{
            background: report.passed ? 'rgba(34,197,94,0.10)' : 'rgba(245,158,11,0.10)',
            borderColor: report.passed ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)',
            color: report.passed ? '#22c55e' : '#f59e0b',
          }}
        >
          {report.passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {report.passed ? 'Passed' : 'Needs Improvement'}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-btn border border-border p-3">
            <p className="text-xs text-text-3">Correlation Score</p>
            <p className="mt-1 text-xl font-semibold text-text">{report.correlation_score.toFixed(1)}%</p>
          </div>
          <div className="rounded-btn border border-border p-3">
            <p className="text-xs text-text-3">Distribution Score</p>
            <p className="mt-1 text-xl font-semibold text-text">{report.distribution_score.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-text">Correlation Heatmap</h4>
          <CorrelationHeatmap original={matrices.original ?? {}} synthetic={matrices.synthetic ?? {}} />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-text">Per-column Distribution Checks</h4>
          <div className="space-y-2">
            {distribution.map((entry) => (
              <div key={`${entry.column}-${entry.method}`} className="flex items-center justify-between rounded-btn border border-border p-3">
                <div>
                  <p className="text-sm font-semibold text-text">{entry.column}</p>
                  <p className="text-xs text-text-3">
                    {entry.type} • {entry.method} • statistic {entry.statistic.toFixed(4)} • p-value {entry.p_value.toFixed(4)}
                  </p>
                </div>
                <Badge variant={entry.passed ? 'default' : 'secondary'}>{entry.passed ? 'Pass' : 'Fail'}</Badge>
              </div>
            ))}
          </div>
        </div>

        {report.overall_score < 70 && (
          <div className="rounded-lg border border-[rgba(167,139,250,0.15)] bg-[rgba(167,139,250,0.05)] p-4">
            <button
              onClick={() => setShowAdvice(!showAdvice)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI Advice</span>
              {showAdvice ? (
                <ChevronUp className="h-4 w-4 ml-auto text-[rgba(241,240,255,0.38)]" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-auto text-[rgba(241,240,255,0.38)]" />
              )}
            </button>
            {showAdvice && (
              <div className="mt-3 pl-6 space-y-2">
                {aiAdvice ? (
                  aiAdvice.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-sm text-[rgba(241,240,255,0.80)]">
                      {line.replace(/^[•\-]\s*/, '• ')}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-[rgba(241,240,255,0.38)]">
                    AI advice will appear here after quality analysis completes.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
