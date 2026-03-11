import { notFound } from 'next/navigation';

import { ComplianceReport } from '@/components/reports/ComplianceReport';
import { PrivacyScore } from '@/components/reports/PrivacyScore';
import { QualityComparisonReport } from '@/components/reports/QualityComparisonReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/server';
import type { PrivacyScore as PrivacyScoreType, QualityReport as QualityReportType } from '@/types';

interface DatasetDetailPageProps {
  params: {
    id: string;
  };
}

export default async function DatasetDetailPage({ params }: DatasetDetailPageProps) {
  const supabase = await createClient();

  const { data: syntheticDataset } = await supabase
    .from('synthetic_datasets')
    .select('id, status, created_at, original_dataset_id, row_count, datasets(name,row_count,column_count)')
    .eq('id', params.id)
    .maybeSingle();

  if (!syntheticDataset) {
    notFound();
  }

  const { data: privacyScore } = await supabase
    .from('privacy_scores')
    .select('*')
    .eq('synthetic_dataset_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();


  const { data: qualityReport } = await supabase
    .from('quality_reports')
    .select('*')
    .eq('synthetic_dataset_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const datasetName =
    (syntheticDataset.datasets as { name?: string } | null)?.name ?? `Dataset ${syntheticDataset.id.slice(0, 8)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{datasetName}</h1>
        <p className="text-sm text-text-2">Synthetic dataset details, reports, and downloads.</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Score</TabsTrigger>
          <TabsTrigger value="quality">Quality Report</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-text-2">
              <p>
                Synthetic Dataset ID: <span className="text-text">{syntheticDataset.id}</span>
              </p>
              <p>
                Status: <span className="text-text">{syntheticDataset.status}</span>
              </p>
              <p>
                Created:{' '}
                <span className="text-text">{new Date(syntheticDataset.created_at).toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacyScore privacyScore={privacyScore as PrivacyScoreType | null} />
        </TabsContent>

        <TabsContent value="quality">
          <QualityComparisonReport
            report={qualityReport as QualityReportType | null}
            originalRowCount={(syntheticDataset.datasets as { row_count?: number | null } | null)?.row_count ?? null}
            syntheticRowCount={syntheticDataset.row_count ?? null}
            originalColumnCount={(syntheticDataset.datasets as { column_count?: number | null } | null)?.column_count ?? null}
          />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceReport syntheticDatasetId={params.id} />
        </TabsContent>

        <TabsContent value="download">
          <Card>
            <CardHeader>
              <CardTitle>Download</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-2">Download links and export actions will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
