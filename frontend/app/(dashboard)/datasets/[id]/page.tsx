'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Download, RefreshCw } from 'lucide-react'

import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap'
import { DistributionChart } from '@/components/charts/DistributionChart'
import { TrustScore } from '@/components/reports/TrustScore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  api,
  downloadCompliancePDF,
  downloadSynthetic,
  getComplianceReport,
  getDataset,
  getPrivacyScore,
  getQualityReport,
  listSyntheticDatasets,
} from '@/lib/api'
import { toast } from 'sonner'

export default function DatasetDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [entity, setEntity] = useState<any>(null)
  const [syntheticRows, setSyntheticRows] = useState<any[]>([])
  const [selectedSynthetic, setSelectedSynthetic] = useState<any>(null)
  const [privacy, setPrivacy] = useState<any>(null)
  const [quality, setQuality] = useState<any>(null)
  const [compliance, setCompliance] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getDataset(params.id)
        setEntity(data)

        if (data.type === 'original') {
          const synth = await listSyntheticDatasets(data.id)
          setSyntheticRows(synth)
        } else {
          const [{ data: syntheticFull }, p, q, c] = await Promise.all([
            api.synthetic.get(data.id),
            getPrivacyScore(data.id),
            getQualityReport(data.id),
            getComplianceReport(data.id),
          ])
          setSelectedSynthetic(syntheticFull)
          setPrivacy(p)
          setQuality(q)
          setCompliance(c)
        }
      } catch {
        setEntity(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.id])

  const schemaRows = entity?.schema?.columns ?? entity?.schema?.fields ?? []

  const qualityRows = useMemo(() => {
    const stats = quality?.column_stats ?? {}
    return Object.entries(stats)
      .slice(0, 10)
      .map(([column, item]: any) => ({
        column,
        originalMean: Number(item?.original_mean ?? item?.mean_original ?? 0),
        syntheticMean: Number(item?.synthetic_mean ?? item?.mean_synthetic ?? 0),
      }))
  }, [quality])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!entity) {
    return <div className="p-8 text-sm text-white/70">Dataset not found.</div>
  }

  if (entity.type === 'original') {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-text">{entity.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/65">
              <Badge variant="outline">{String(entity.file_type ?? 'csv').toUpperCase()}</Badge>
              <span>{(entity.row_count ?? 0).toLocaleString()} rows</span>
              <span>{entity.column_count ?? 0} columns</span>
              <span>{entity.created_at ? format(new Date(entity.created_at), 'MMM d, yyyy') : 'Unknown date'}</span>
            </div>
          </div>
          <Button asChild>
            <Link href={`/generate/${entity.id}`}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Synthetic
            </Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(167,139,250,0.14)] text-white/65">
                    <th className="py-2 pr-4 text-left">Column</th>
                    <th className="py-2 pr-4 text-left">Type</th>
                    <th className="py-2 pr-4 text-left">Null %</th>
                    <th className="py-2 text-left">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {schemaRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-white/50" colSpan={4}>No schema metadata available.</td>
                    </tr>
                  ) : (
                    schemaRows.map((col: any, idx: number) => (
                      <tr key={`${col.name ?? col.column_name ?? idx}`} className="border-b border-[rgba(167,139,250,0.08)]">
                        <td className="py-2 pr-4">{col.name ?? col.column_name ?? '-'}</td>
                        <td className="py-2 pr-4">{col.type ?? col.dtype ?? '-'}</td>
                        <td className="py-2 pr-4">{Number(col.null_percentage ?? col.null_pct ?? 0).toFixed(1)}%</td>
                        <td className="py-2">{Array.isArray(col.samples) ? String(col.samples[0] ?? '-') : String(col.sample_value ?? '-')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Synthetic Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(167,139,250,0.14)] text-white/65">
                    <th className="py-2 pr-4 text-left">Method</th>
                    <th className="py-2 pr-4 text-left">Rows</th>
                    <th className="py-2 pr-4 text-left">Trust Score</th>
                    <th className="py-2 pr-4 text-left">Status</th>
                    <th className="py-2 pr-4 text-left">Created</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {syntheticRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-white/50" colSpan={6}>No synthetic generations yet.</td>
                    </tr>
                  ) : (
                    syntheticRows.map((row: any) => (
                      <tr key={row.id} className="border-b border-[rgba(167,139,250,0.08)]">
                        <td className="py-2 pr-4">{String(row.generation_method ?? '-').replace('_', ' ')}</td>
                        <td className="py-2 pr-4">{(row.row_count ?? 0).toLocaleString()}</td>
                        <td className="py-2 pr-4">{row.trust_score?.composite_score ? `${Math.round(row.trust_score.composite_score)}/100` : '—'}</td>
                        <td className="py-2 pr-4">{row.status ?? 'unknown'}</td>
                        <td className="py-2 pr-4">{row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/datasets/${row.id}`}>View</Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const url = await downloadSynthetic(row.id)
                                  window.open(url, '_blank', 'noopener,noreferrer')
                                } catch {
                                  toast.error('Download unavailable')
                                }
                              }}
                            >
                              <Download className="mr-1 h-3.5 w-3.5" /> Download
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const trust = selectedSynthetic?.trust_score ?? selectedSynthetic?.trust_scores?.[0] ?? {}

  return (
    <div className="space-y-6">
      <div className="text-sm text-white/60">
        <Link className="text-primary underline" href={`/datasets/${entity.original_dataset?.id ?? entity.original_dataset_id}`}>
          Back to original dataset
        </Link>
      </div>

      <TrustScore
        composite_score={trust?.composite_score ?? 0}
        privacy_score={privacy?.overall_score ?? 0}
        fidelity_score={quality?.overall_score ?? 0}
        compliance_score={compliance?.passed ? 100 : 50}
        label={trust?.label ?? 'Needs Improvement'}
      />

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => downloadCompliancePDF(entity.id)}>Download Compliance PDF</Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const url = await downloadSynthetic(entity.id)
                window.open(url, '_blank', 'noopener,noreferrer')
              } catch {
                toast.error('Download unavailable')
              }
            }}
          >
            Download Synthetic CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fidelity Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <DistributionChart
            columnName={Object.keys(quality?.column_stats ?? {})[0] ?? 'Column'}
            type={'numeric'}
            data={Object.values(quality?.column_stats ?? {})?.[0]?.distribution ?? []}
          />

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(167,139,250,0.14)] text-white/65">
                  <th className="py-2 pr-4 text-left">Column</th>
                  <th className="py-2 pr-4 text-left">Original Mean</th>
                  <th className="py-2 text-left">Synthetic Mean</th>
                </tr>
              </thead>
              <tbody>
                {qualityRows.map((row) => (
                  <tr key={row.column} className="border-b border-[rgba(167,139,250,0.08)]">
                    <td className="py-2 pr-4">{row.column}</td>
                    <td className="py-2 pr-4">{row.originalMean.toFixed(4)}</td>
                    <td className="py-2">{row.syntheticMean.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CorrelationHeatmap
            original={quality?.details?.correlation_original ?? quality?.correlation_original ?? {}}
            synthetic={quality?.details?.correlation_synthetic ?? quality?.correlation_synthetic ?? {}}
          />
        </CardContent>
      </Card>
    </div>
  )
}
