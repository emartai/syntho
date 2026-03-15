'use client';

import { Download } from 'lucide-react';
import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

import type { PrivacyScore as PrivacyScoreType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PrivacyScoreProps {
  privacyScore: PrivacyScoreType | null;
}

type PiiColumnResult = {
  detection_ratio?: number;
  entities?: string[];
};

const riskColors: Record<PrivacyScoreType['risk_level'], string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#fb923c',
  critical: '#ef4444',
};

const riskBadgeVariant: Record<PrivacyScoreType['risk_level'], 'default' | 'destructive'> = {
  low: 'default',
  medium: 'default',
  high: 'destructive',
  critical: 'destructive',
};

export function PrivacyScore({ privacyScore }: PrivacyScoreProps) {
  if (!privacyScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Privacy Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-2">No privacy report is available for this dataset yet.</p>
        </CardContent>
      </Card>
    );
  }

  const details = privacyScore.details ?? {};
  const singlingOut = details.singling_out_risk as { high_risk?: boolean } | undefined;
  const linkability = details.linkability_risk as { max_overlap_ratio?: number } | undefined;
  const piiRisk = details.pii_risk as { penalty?: number } | undefined;

  const color = riskColors[privacyScore.risk_level];
  const score = Math.max(0, Math.min(100, Number(privacyScore.overall_score || 0)));
  const piiEntries = Object.entries(privacyScore.pii_detected ?? {}) as [string, PiiColumnResult][];

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(privacyScore, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `privacy-report-${privacyScore.synthetic_dataset_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="space-y-5">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Privacy Score</CardTitle>
        <Badge variant={riskBadgeVariant[privacyScore.risk_level]}>
          {privacyScore.risk_level.toUpperCase()}
        </Badge>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-card border border-border p-4">
          <div className="h-64 w-full max-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="95%"
                barSize={22}
                data={[{ name: 'score', value: score, fill: color }]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar background dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="-mt-28 text-5xl font-bold" style={{ color }}>
            {Math.round(score)}
          </p>
          <p className="mt-1 text-sm text-text-2">Overall Privacy Safety Score</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text">Detected PII Columns</h4>
          {piiEntries.length === 0 ? (
            <p className="text-sm text-success">No high-frequency PII detected in sampled synthetic columns.</p>
          ) : (
            <div className="space-y-3">
              {piiEntries.map(([column, value]) => (
                <div key={column} className="rounded-btn border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text">{column}</p>
                    <p className="text-xs text-text-3">
                      {(Number(value?.detection_ratio ?? 0) * 100).toFixed(1)}% detected
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(value.entities ?? []).map((entity) => (
                      <Badge key={`${column}-${entity}`} variant="outline">
                        {entity}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h4 className="mb-3 text-sm font-semibold text-text">Risk Breakdown</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-btn border border-border p-3">
              <p className="text-xs text-text-3">PII Risk</p>
              <p className="mt-1 text-sm text-text">Penalty: -{piiRisk?.penalty ?? 0}</p>
            </div>
            <div className="rounded-btn border border-border p-3">
              <p className="text-xs text-text-3">Singling Out</p>
              <p className="mt-1 text-sm text-text">High Risk: {singlingOut?.high_risk ? 'Yes' : 'No'}</p>
            </div>
            <div className="rounded-btn border border-border p-3">
              <p className="text-xs text-text-3">Linkability</p>
              <p className="mt-1 text-sm text-text">
                Overlap: {((Number(linkability?.max_overlap_ratio ?? 0) || 0) * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download Privacy Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
