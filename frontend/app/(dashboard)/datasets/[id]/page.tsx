'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Download, FileText, Shield, BarChart3, CheckCircle, AlertTriangle, Play, Trash2, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AuroraBadge } from '@/components/shared/AuroraBadge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function DatasetDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [dataset, setDataset] = useState<any>(null);
  const [syntheticVersions, setSyntheticVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: ds } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!ds) {
        setLoading(false);
        return;
      }
      setDataset(ds);

      const { data: synth } = await supabase
        .from('synthetic_datasets')
        .select('*, privacy_scores(*), quality_reports(*)')
        .eq('original_dataset_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setSyntheticVersions(synth || []);
      setLoading(false);

      // Fetch AI recommendation if dataset is ready
      if (ds.status === 'ready' && !ds.schema?.ai_recommendation) {
        fetchAiRecommendation(ds.id);
      }
    };
    fetchData();
  }, [user, params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!dataset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">{dataset.name}</h1>
          <p className="text-sm text-[rgba(241,240,255,0.65)] mt-1">
            Uploaded {format(new Date(dataset.created_at), 'MMMM d, yyyy')} • {dataset.row_count?.toLocaleString()} rows • {dataset.column_count} columns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleDownload(dataset.id, 'original')}>
            <Download className="h-4 w-4 mr-2" />
            Download Original
          </Button>
          <Link href={`/generate/${dataset.id}`}>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Generate Synthetic
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="synthetic">Synthetic Versions ({syntheticVersions.length})</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Score</TabsTrigger>
          <TabsTrigger value="quality">Quality Report</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="download">Downloads</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dataset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">File Type</span>
                  <span className="font-medium">{dataset.file_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">File Size</span>
                  <span className="font-medium">{(dataset.file_size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">Rows</span>
                  <span className="font-medium">{dataset.row_count?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">Columns</span>
                  <span className="font-medium">{dataset.column_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">Status</span>
                  <Badge variant={dataset.status === 'ready' ? 'default' : 'secondary'}>
                    {dataset.status}
                  </Badge>
                </div>

                {dataset.schema?.ai_recommendation && (
                  <div className="mt-4 p-3 rounded-lg bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)]">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">AI Recommends</span>
                    </div>
                    <p className="text-sm text-text">
                      {dataset.schema.ai_recommendation.method.toUpperCase()} · {dataset.schema.ai_recommendation.epochs} epochs · batch {dataset.schema.ai_recommendation.batch_size}
                    </p>
                    <p className="text-xs text-[rgba(241,240,255,0.38)] mt-1">
                      {dataset.schema.ai_recommendation.reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schema Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {dataset.schema?.columns?.slice(0, 5).map((col: any) => (
                  <div key={col.name} className="flex items-center justify-between py-2 border-b border-[rgba(167,139,250,0.10)] last:border-0">
                    <div>
                      <p className="font-medium text-sm">{col.name}</p>
                      <p className="text-xs text-[rgba(241,240,255,0.38)]">{col.data_type}</p>
                    </div>
                    <div className="text-right text-xs text-[rgba(241,240,255,0.38)]">
                      {col.null_percentage}% null
                    </div>
                  </div>
                ))}
                {dataset.schema?.columns?.length > 5 && (
                  <p className="text-xs text-[rgba(241,240,255,0.38)] mt-2">
                    +{dataset.schema.columns.length - 5} more columns
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="synthetic" className="mt-4">
          {syntheticVersions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-[rgba(241,240,255,0.20)] mx-auto mb-3" />
                <p className="text-[rgba(241,240,255,0.65)] mb-4">No synthetic versions generated yet</p>
                <Link href={`/generate/${dataset.id}`}>
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Generate First Synthetic Version
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {syntheticVersions.map((synth) => (
                <Card key={synth.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium capitalize">{synth.generation_method.replace('_', ' ')}</h3>
                          <Badge variant={synth.status === 'completed' ? 'default' : 'secondary'}>
                            {synth.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-[rgba(241,240,255,0.38)]">
                          Generated {format(new Date(synth.created_at), 'MMM d, yyyy')} • {synth.row_count?.toLocaleString()} rows
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {synth.status === 'completed' && (
                          <Button variant="outline" size="sm" onClick={() => handleDownload(synth.id, 'synthetic')}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        <Link href={`/datasets/${synth.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {synth.status === 'running' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[rgba(241,240,255,0.65)]">Progress</span>
                          <span>{synth.progress}%</span>
                        </div>
                        <Progress value={synth.progress} className="h-2" />
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      {synth.privacy_scores && (
                        <div className="rounded-lg bg-[rgba(167,139,250,0.05)] p-3">
                          <p className="text-xs text-[rgba(241,240,255,0.38)] mb-1">Privacy Score</p>
                          <p className="text-xl font-bold text-primary">{synth.privacy_scores.overall_score}</p>
                          <p className="text-xs text-[rgba(241,240,255,0.38)]">{synth.privacy_scores.risk_level} risk</p>
                        </div>
                      )}
                      {synth.quality_reports && (
                        <div className="rounded-lg bg-[rgba(6,182,212,0.05)] p-3">
                          <p className="text-xs text-[rgba(241,240,255,0.38)] mb-1">Quality Score</p>
                          <p className="text-xl font-bold text-cyan-400">{synth.quality_reports.overall_score}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-[rgba(34,197,94,0.05)] p-3">
                        <p className="text-xs text-[rgba(241,240,255,0.38)] mb-1">Reports</p>
                        <div className="flex gap-1">
                          {synth.privacy_scores && <CheckCircle className="h-4 w-4 text-green-400" />}
                          {synth.quality_reports && <CheckCircle className="h-4 w-4 text-green-400" />}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="privacy" className="mt-4">
          <PrivacyTab datasetId={params.id} syntheticVersions={syntheticVersions} />
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <QualityTab datasetId={params.id} syntheticVersions={syntheticVersions} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <ComplianceTab datasetId={params.id} syntheticVersions={syntheticVersions} />
        </TabsContent>

        <TabsContent value="download" className="mt-4">
          <DownloadTab dataset={dataset} syntheticVersions={syntheticVersions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Sparkles, Info } from 'lucide-react';

async function fetchAiRecommendation(datasetId: string) {
  try {
    await api.ai.recommendMethod(datasetId);
  } catch (e) {
    // Silently fail - AI recommendation is optional
  }
}

function PrivacyTab({ datasetId, syntheticVersions }: { datasetId: string; syntheticVersions: any[] }) {
  const [scores, setScores] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from('privacy_scores')
        .select('*')
        .in('synthetic_dataset_id', syntheticVersions.map(s => s.id))
        .order('created_at', { ascending: false });
      setScores(data || []);
    };
    if (syntheticVersions.length) fetchScores();
  }, [syntheticVersions]);

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[rgba(241,240,255,0.38)]">
          No privacy scores available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {scores.map((score) => (
        <Card key={score.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy Score: {score.overall_score}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[rgba(241,240,255,0.65)]">Risk Level</span>
                <Badge variant={score.risk_level === 'low' ? 'default' : 'destructive'}>
                  {score.risk_level}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-[rgba(241,240,255,0.38)] mb-2">PII Detected</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(score.pii_detected || {}).map(([key, value]) => {
                    if (!value) return null;
                    return <Badge key={key} variant="outline">{key}</Badge>;
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QualityTab({ datasetId, syntheticVersions }: { datasetId: string; syntheticVersions: any[] }) {
  const [reports, setReports] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('quality_reports')
        .select('*')
        .in('synthetic_dataset_id', syntheticVersions.map(s => s.id))
        .order('created_at', { ascending: false });
      setReports(data || []);
    };
    if (syntheticVersions.length) fetchReports();
  }, [syntheticVersions]);

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[rgba(241,240,255,0.38)]">
          No quality reports available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Quality Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{report.overall_score}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Overall</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{report.correlation_score}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Correlation</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{report.distribution_score}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Distribution</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={report.passed ? 'default' : 'destructive'}>
                {report.passed ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ComplianceTab({ datasetId, syntheticVersions }: { datasetId: string; syntheticVersions: any[] }) {
  const [reports, setReports] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('compliance_reports')
        .select('*')
        .in('synthetic_dataset_id', syntheticVersions.map(s => s.id))
        .order('created_at', { ascending: false });
      setReports(data || []);
    };
    if (syntheticVersions.length) fetchReports();
  }, [syntheticVersions]);

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[rgba(241,240,255,0.38)]">
          No compliance reports available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium uppercase">{report.report_type} Compliance</h3>
                  {report.passed ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">
                  Generated {format(new Date(report.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              {report.file_path && (
                <Button variant="outline" size="sm" onClick={() => handleComplianceDownload(report.id)}>
                  <FileText className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DownloadTab({ dataset, syntheticVersions }: { dataset: any; syntheticVersions: any[] }) {
  const handleDownload = async (id: string, type: 'original' | 'synthetic') => {
    try {
      const url = type === 'original'
        ? await getOriginalDownloadUrl(id)
        : await getSyntheticDownloadUrl(id);
      if (url) window.open(url, '_blank');
    } catch (error: any) {
      toast.error('Failed to get download link');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Original Dataset</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => handleDownload(dataset.id, 'original')}>
            <Download className="h-4 w-4 mr-2" />
            Download Original ({dataset.file_type})
          </Button>
        </CardContent>
      </Card>

      {syntheticVersions.filter(s => s.status === 'completed').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Synthetic Versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {syntheticVersions.filter(s => s.status === 'completed').map((synth) => (
              <div key={synth.id} className="flex items-center justify-between p-3 rounded-lg border border-[rgba(167,139,250,0.10)]">
                <div>
                  <p className="font-medium capitalize">{synth.generation_method.replace('_', ' ')}</p>
                  <p className="text-sm text-[rgba(241,240,255,0.38)]">
                    {synth.row_count?.toLocaleString()} rows • {format(new Date(synth.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDownload(synth.id, 'synthetic')}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {syntheticVersions.filter(s => s.status === 'completed').map((synth) => (
            <div key={`reports-${synth.id}`} className="flex items-center justify-between p-3 rounded-lg border border-[rgba(167,139,250,0.10)]">
              <div>
                <p className="font-medium capitalize">{synth.generation_method.replace('_', ' ')} Reports</p>
                <p className="text-sm text-[rgba(241,240,255,0.38)]">Privacy, Quality, Compliance PDFs</p>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                View Reports
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function getOriginalDownloadUrl(datasetId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('datasets').select('file_path').eq('id', datasetId).single();
  if (!data?.file_path) return null;
  const { data: urlData } = await supabase.storage.from('datasets').createSignedUrl(data.file_path, 3600);
  return urlData?.signedUrl;
}

async function getSyntheticDownloadUrl(synthId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('synthetic_datasets').select('file_path').eq('id', synthId).single();
  if (!data?.file_path) return null;
  const { data: urlData } = await supabase.storage.from('synthetic').createSignedUrl(data.file_path, 3600);
  return urlData?.signedUrl;
}

async function handleDownload(id: string, type: 'original' | 'synthetic') {
  const url = type === 'original' ? await getOriginalDownloadUrl(id) : await getSyntheticDownloadUrl(id);
  if (url) window.open(url, '_blank');
  else toast.error('Download not available');
}

async function handleComplianceDownload(reportId: string) {
  toast.success('Opening compliance report...');
}