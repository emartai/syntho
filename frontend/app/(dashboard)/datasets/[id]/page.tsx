'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useJobProgress } from '@/hooks/useJobProgress'
import { startGeneration, downloadSynthetic } from '@/lib/api'
import { format } from 'date-fns'
import { Download, FileText, Shield, BarChart3, CheckCircle, AlertTriangle, Play } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function DatasetDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const supabase = createClient()
  const [dataset, setDataset] = useState<any>(null)
  const [syntheticVersions, setSyntheticVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSyntheticId, setActiveSyntheticId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string>('gaussian_copula')

  const jobProgress = useJobProgress(activeSyntheticId ?? undefined)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const { data: ds } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!ds) {
        setLoading(false)
        return
      }
      setDataset(ds)

      const { data: synth } = await supabase
        .from('synthetic_datasets')
        .select('*, privacy_scores(*), quality_reports(*)')
        .eq('original_dataset_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const versions = synth ?? []
      setSyntheticVersions(versions)

      // If there's a running job, track it
      const runningJob = versions.find(
        (s: any) => s.status === 'pending' || s.status === 'running'
      )
      if (runningJob) {
        setActiveSyntheticId(runningJob.id)
      }

      setLoading(false)
    }
    fetchData()
  }, [user, params.id])

  // Update syntheticVersions when job progress changes
  useEffect(() => {
    if (!activeSyntheticId || !jobProgress.syntheticDataset) return
    setSyntheticVersions((prev) =>
      prev.map((s) =>
        s.id === activeSyntheticId ? { ...s, ...jobProgress.syntheticDataset } : s
      )
    )
    if (jobProgress.status === 'completed' || jobProgress.status === 'failed') {
      setActiveSyntheticId(null)
      setGenerating(false)
    }
  }, [jobProgress.status, jobProgress.progress, activeSyntheticId])

  const handleGenerate = async () => {
    if (!dataset) return
    setGenerating(true)
    try {
      const result = await startGeneration({
        dataset_id: dataset.id,
        method: selectedMethod as any,
      })
      const newSynthId = result?.id
      if (newSynthId) {
        setActiveSyntheticId(newSynthId)
        setSyntheticVersions((prev) => [
          { id: newSynthId, status: 'pending', progress: 0, generation_method: selectedMethod, created_at: new Date().toISOString() },
          ...prev,
        ])
      }
      toast.success('Generation started!')
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      if (typeof detail === 'object' && detail?.error === 'quota_exceeded') {
        toast.error(detail.message ?? 'Quota exceeded')
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Failed to start generation')
      }
      setGenerating(false)
    }
  }

  const handleDownload = async (synthId: string) => {
    try {
      const url = await downloadSynthetic(synthId)
      const a = document.createElement('a')
      a.href = url
      a.download = `synthetic-${synthId}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.error('Download failed — please try again')
    }
  }

  const handleOriginalDownload = async () => {
    if (!dataset?.file_path) return
    try {
      const { data } = await supabase.storage.from('datasets').createSignedUrl(dataset.file_path, 3600)
      if (data?.signedUrl) {
        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = dataset.name ?? 'dataset'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch {
      toast.error('Download failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!dataset) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">{dataset?.name ?? 'Dataset'}</h1>
          <p className="text-sm text-[rgba(241,240,255,0.65)] mt-1">
            Uploaded {dataset?.created_at ? format(new Date(dataset.created_at), 'MMMM d, yyyy') : 'Unknown'} · {(dataset?.row_count ?? 0).toLocaleString()} rows · {dataset?.column_count ?? 0} columns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOriginalDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Original
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="synthetic">Synthetic ({syntheticVersions.length})</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Score</TabsTrigger>
          <TabsTrigger value="quality">Quality Report</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
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
                  <span className="font-medium">{dataset?.file_type ?? 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">File Size</span>
                  <span className="font-medium">{((dataset?.file_size ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">Rows</span>
                  <span className="font-medium">{(dataset?.row_count ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">Columns</span>
                  <span className="font-medium">{dataset?.column_count ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgba(241,240,255,0.38)]">Status</span>
                  <Badge variant={dataset?.status === 'ready' ? 'default' : 'secondary'}>
                    {dataset?.status ?? 'unknown'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schema Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {(dataset?.schema?.columns ?? []).slice(0, 5).map((col: any) => (
                  <div key={col?.name ?? Math.random()} className="flex items-center justify-between py-2 border-b border-[rgba(167,139,250,0.10)] last:border-0">
                    <div>
                      <p className="font-medium text-sm">{col?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-[rgba(241,240,255,0.38)]">{col?.data_type ?? 'Unknown'}</p>
                    </div>
                    <div className="text-right text-xs text-[rgba(241,240,255,0.38)]">
                      {col?.null_percentage ?? 0}% null
                    </div>
                  </div>
                ))}
                {(dataset?.schema?.columns ?? []).length > 5 && (
                  <p className="text-xs text-[rgba(241,240,255,0.38)] mt-2">
                    +{(dataset?.schema?.columns ?? []).length - 5} more columns
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Synthetic Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-[rgba(241,240,255,0.65)] block mb-2">Generation Method</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] text-sm text-white"
                  disabled={generating}
                >
                  <option value="gaussian_copula">Gaussian Copula (faster)</option>
                  <option value="ctgan">CTGAN (more accurate)</option>
                </select>
              </div>

              {activeSyntheticId && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[rgba(241,240,255,0.65)]">
                      {jobProgress.syntheticDataset?.current_step ?? jobProgress.status}
                    </span>
                    <span>{jobProgress.progress}%</span>
                  </div>
                  <Progress value={jobProgress.progress} className="h-2" />
                  {jobProgress.status === 'failed' && (
                    <p className="text-sm text-red-400">
                      {jobProgress.error ?? 'Generation failed'}
                    </p>
                  )}
                  {jobProgress.status === 'completed' && (
                    <p className="text-sm text-green-400">Generation complete!</p>
                  )}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={generating || !!activeSyntheticId}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Start Generation'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="synthetic" className="mt-4">
          {syntheticVersions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-[rgba(241,240,255,0.65)] mb-4">No synthetic versions generated yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {syntheticVersions.map((synth: any) => (
                <Card key={synth?.id ?? Math.random()}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium capitalize">{(synth?.generation_method ?? '').replace('_', ' ')}</h3>
                          <Badge variant={synth?.status === 'completed' ? 'default' : 'secondary'}>
                            {synth?.status ?? 'unknown'}
                          </Badge>
                        </div>
                        <p className="text-sm text-[rgba(241,240,255,0.38)]">
                          {synth?.created_at ? format(new Date(synth.created_at), 'MMM d, yyyy') : 'Unknown'}
                          {' · '}{(synth?.row_count ?? 0).toLocaleString()} rows
                        </p>
                      </div>
                      {synth?.status === 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => handleDownload(synth.id)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>

                    {(synth?.status === 'running' || synth?.status === 'pending') && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[rgba(241,240,255,0.65)]">
                            {synth?.current_step ?? 'Processing'}
                          </span>
                          <span>{synth?.progress ?? 0}%</span>
                        </div>
                        <Progress value={synth?.progress ?? 0} className="h-2" />
                      </div>
                    )}

                    {synth?.status === 'failed' && synth?.error_message && (
                      <p className="text-sm text-red-400 mt-2">{synth.error_message}</p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3 mt-4">
                      {synth?.privacy_scores && (
                        <div className="rounded-lg bg-[rgba(167,139,250,0.05)] p-3">
                          <p className="text-xs text-[rgba(241,240,255,0.38)] mb-1">Privacy Score</p>
                          <p className="text-xl font-bold text-primary">{synth.privacy_scores?.overall_score ?? 'N/A'}</p>
                          <p className="text-xs text-[rgba(241,240,255,0.38)]">{synth.privacy_scores?.risk_level ?? 'unknown'} risk</p>
                        </div>
                      )}
                      {synth?.quality_reports && (
                        <div className="rounded-lg bg-[rgba(6,182,212,0.05)] p-3">
                          <p className="text-xs text-[rgba(241,240,255,0.38)] mb-1">Quality Score</p>
                          <p className="text-xl font-bold text-cyan-400">{synth.quality_reports?.overall_score ?? 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="privacy" className="mt-4">
          <PrivacyTab syntheticVersions={syntheticVersions} />
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <QualityTab syntheticVersions={syntheticVersions} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <ComplianceTab syntheticVersions={syntheticVersions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PrivacyTab({ syntheticVersions }: { syntheticVersions: any[] }) {
  const [scores, setScores] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const ids = (syntheticVersions ?? []).map((s: any) => s?.id).filter(Boolean)
    if (ids.length === 0) return
    const fetchScores = async () => {
      const { data } = await supabase
        .from('privacy_scores')
        .select('*')
        .in('synthetic_dataset_id', ids)
        .order('created_at', { ascending: false })
      setScores(data ?? [])
    }
    fetchScores()
  }, [syntheticVersions])

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[rgba(241,240,255,0.38)]">
          No privacy scores available yet
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {scores.map((score: any) => (
        <Card key={score?.id ?? Math.random()}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy Score: {score?.overall_score ?? 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[rgba(241,240,255,0.65)]">Risk Level</span>
                <Badge variant={(score?.risk_level ?? '') === 'low' ? 'default' : 'destructive'}>
                  {score?.risk_level ?? 'unknown'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-[rgba(241,240,255,0.38)] mb-2">PII Detected</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(score?.pii_detected ?? {}).map(([key, value]) => {
                    if (!value) return null
                    return <Badge key={key} variant="outline">{key}</Badge>
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function QualityTab({ syntheticVersions }: { syntheticVersions: any[] }) {
  const [reports, setReports] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const ids = (syntheticVersions ?? []).map((s: any) => s?.id).filter(Boolean)
    if (ids.length === 0) return
    const fetchReports = async () => {
      const { data } = await supabase
        .from('quality_reports')
        .select('*')
        .in('synthetic_dataset_id', ids)
        .order('created_at', { ascending: false })
      setReports(data ?? [])
    }
    fetchReports()
  }, [syntheticVersions])

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[rgba(241,240,255,0.38)]">
          No quality reports available yet
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {reports.map((report: any) => (
        <Card key={report?.id ?? Math.random()}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Quality Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{report?.overall_score ?? 'N/A'}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Overall</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{report?.correlation_score ?? 'N/A'}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Correlation</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{report?.distribution_score ?? 'N/A'}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Distribution</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={report?.passed ? 'default' : 'destructive'}>
                {report?.passed ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ComplianceTab({ syntheticVersions }: { syntheticVersions: any[] }) {
  const [reports, setReports] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const ids = (syntheticVersions ?? []).map((s: any) => s?.id).filter(Boolean)
    if (ids.length === 0) return
    const fetchReports = async () => {
      const { data } = await supabase
        .from('compliance_reports')
        .select('*')
        .in('synthetic_dataset_id', ids)
        .order('created_at', { ascending: false })
      setReports(data ?? [])
    }
    fetchReports()
  }, [syntheticVersions])

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-[rgba(241,240,255,0.38)]">
          No compliance reports available yet
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report: any) => (
        <Card key={report?.id ?? Math.random()}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium uppercase">{(report?.report_type ?? '').toUpperCase()} Compliance</h3>
                  {report?.passed ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">
                  {report?.created_at ? format(new Date(report.created_at), 'MMM d, yyyy') : 'Unknown'}
                </p>
              </div>
              {report?.file_path && (
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Download PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
