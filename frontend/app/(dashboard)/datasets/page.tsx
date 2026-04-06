'use client'

import { useEffect, useState } from 'react'
import { listDatasets } from '@/lib/api'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listDatasets()
      .then((d) => setDatasets(Array.isArray(d) ? d : []))
      .catch((e) => setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8">
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="glass p-4 animate-pulse h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <button onClick={() => window.location.reload()}
        className="btn-gradient px-4 py-2 rounded-lg text-sm text-white">
        Try again
      </button>
    </div>
  )

  if (datasets.length === 0) return (
    <div className="p-8 text-center">
      <p className="text-white/50 mb-2 text-lg">No datasets yet</p>
      <p className="text-white/30 text-sm mb-6">
        Upload your first dataset to start generating synthetic data
      </p>
      <Link href="/upload"
        className="btn-gradient px-6 py-3 rounded-xl text-white font-medium inline-block">
        Upload Dataset
      </Link>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-display font-bold text-white">My Datasets</h1>
        <Link href="/upload"
          className="btn-gradient px-4 py-2 rounded-lg text-sm text-white font-medium inline-block">
          + Upload Dataset
        </Link>
      </div>
      <div className="space-y-3">
        {datasets.map((d: any) => (
          <Link key={d.id} href={`/datasets/${d.id}`}
            className="glass block p-4 rounded-xl hover:border-primary/40 transition-all">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">{d.name ?? 'Untitled'}</p>
                <p className="text-white/40 text-sm mt-1">
                  {(d.row_count ?? 0).toLocaleString()} rows
                  {' · '}{d.column_count ?? 0} columns
                  {' · '}{(d.file_type ?? 'csv').toUpperCase()}
                  {d.created_at ? ` · ${formatDistanceToNow(new Date(d.created_at))} ago` : ''}
                </p>
              </div>
              <span className={`ml-3 shrink-0 text-xs px-2 py-1 rounded-full ${
                d.status === 'ready'      ? 'bg-green-500/20 text-green-400'  :
                d.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                d.status === 'error'      ? 'bg-red-500/20 text-red-400'      :
                                            'bg-white/10 text-white/40'
              }`}>{d.status ?? 'unknown'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
