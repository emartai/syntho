'use client'

import * as React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Loader2, Play, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

export interface DatasetRow {
  id: string
  name?: string
  type: 'original' | 'synthetic'
  row_count?: number
  status?: string
  created_at?: string
  original_dataset_id?: string
  trust_score?: { composite_score?: number } | null
  composite_score?: number | null
}

interface DatasetTableProps {
  datasets: DatasetRow[]
  onDelete: (dataset: DatasetRow) => void
}

const PAGE_SIZE = 20

const STATUS_STYLES: Record<string, string> = {
  uploaded: 'bg-white/10 text-white/70 border-white/20',
  ready: 'bg-green-500/15 text-green-300 border-green-500/30',
  processing: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  running: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  completed: 'bg-green-500/15 text-green-300 border-green-500/30',
  error: 'bg-red-500/15 text-red-300 border-red-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
}

function prettyStatus(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function scoreClass(score: number) {
  if (score >= 80) return 'bg-green-500/15 text-green-300 border-green-500/30'
  if (score >= 60) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
  if (score >= 40) return 'bg-orange-500/15 text-orange-200 border-orange-500/30'
  return 'bg-red-500/15 text-red-300 border-red-500/30'
}

export function DatasetTable({ datasets, onDelete }: DatasetTableProps) {
  const totalPages = Math.max(1, Math.ceil(datasets.length / PAGE_SIZE))
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageData = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return datasets.slice(start, start + PAGE_SIZE)
  }, [datasets, page])

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[rgba(167,139,250,0.14)]">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-[rgba(167,139,250,0.14)] bg-[rgba(255,255,255,0.02)]">
              {['Name', 'Type', 'Rows', 'Status', 'Trust Score', 'Created', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-sm font-medium text-[rgba(241,240,255,0.65)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((dataset) => {
              const status = dataset.status ?? 'uploaded'
              const isProcessing = status === 'processing' || status === 'pending' || status === 'running'
              const score = Number(dataset.trust_score?.composite_score ?? dataset.composite_score ?? NaN)
              return (
                <tr key={dataset.id} className="border-b border-[rgba(167,139,250,0.08)]">
                  <td className="px-4 py-3">
                    <Link href={`/datasets/${dataset.id}`} className="font-medium text-text hover:text-primary">
                      {dataset.name || `Dataset ${dataset.id.slice(0, 8)}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[rgba(241,240,255,0.7)]">
                    {dataset.type === 'original' ? 'Original' : 'Synthetic'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[rgba(241,240,255,0.7)]">
                    {(dataset.row_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[status] || STATUS_STYLES.uploaded}`}>
                      {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {prettyStatus(status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {dataset.type === 'synthetic' && status === 'completed' && Number.isFinite(score) ? (
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${scoreClass(score)}`}>
                        {Math.round(score)}/100
                      </span>
                    ) : (
                      <span className="text-[rgba(241,240,255,0.45)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[rgba(241,240,255,0.7)]">
                    {dataset.created_at ? format(new Date(dataset.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/datasets/${dataset.id}`}>View</Link>
                      </Button>
                      {dataset.type === 'original' ? (
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/generate/${dataset.id}`} aria-label="Generate synthetic">
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => onDelete(dataset)}
                        aria-label="Delete dataset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[rgba(241,240,255,0.65)]">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
