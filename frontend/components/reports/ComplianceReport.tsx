'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { ComplianceReportResponse } from '@/types';

interface ComplianceReportProps {
  syntheticDatasetId: string;
}

function Checklist({ title, checks }: { title: string; checks: Array<{ name: string; passed: boolean; explanation: string }> }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-text">{title}</h4>
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.name} className="rounded-btn border border-border p-3">
            <div className="flex items-start gap-2">
              {check.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 text-danger" />
              )}
              <div>
                <p className="text-sm font-medium text-text">{check.name}</p>
                <p className="text-xs text-text-2">{check.explanation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComplianceReport({ syntheticDatasetId }: ComplianceReportProps) {
  const [data, setData] = useState<ComplianceReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.reports.getCompliance(syntheticDatasetId);
        setData(response.data as ComplianceReportResponse);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Compliance report unavailable.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [syntheticDatasetId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-2">Loading compliance report...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-2">{error || 'Compliance report unavailable.'}</p>
        </CardContent>
      </Card>
    );
  }

  const report = data.report;
  const findings = report.findings || {};
  const gdprChecks = (findings.gdpr_checks || []) as Array<{ name: string; passed: boolean; explanation: string }>;
  const hipaaChecks = (findings.hipaa_checks || []) as Array<{ name: string; passed: boolean; explanation: string }>;

  return (
    <Card className="space-y-5">
      <CardHeader className="space-y-3">
        <CardTitle>Compliance Report</CardTitle>
        <div
          className="flex items-center gap-2 rounded-btn border px-3 py-2 text-sm font-semibold"
          style={{
            background: report.passed ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
            borderColor: report.passed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
            color: report.passed ? '#22c55e' : '#ef4444',
          }}
        >
          {report.passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {report.passed ? 'Compliance Passed' : 'Compliance Failed'}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Checklist title="GDPR Checklist" checks={gdprChecks} />

        <Checklist title="HIPAA Checklist" checks={hipaaChecks} />

        <Button asChild className="gap-2">
          <a href={data.signed_url || '#'} target="_blank" rel="noreferrer" aria-disabled={!data.signed_url}>
            <Download className="h-4 w-4" />
            Download Full PDF Report
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
