'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'

import { DatasetRow, DatasetTable } from '@/components/datasets/DatasetTable'
import { Button } from '@/components/ui/button'
import { deleteDataset, listDatasets, listSyntheticDatasets } from '@/lib/api'
import { toast } from 'sonner'

const FILTERS = ['all', 'original', 'synthetic'] as const
const SORTS = ['newest', 'oldest', 'most_rows'] as const

type DatasetFilter = (typeof FILTERS)[number]
type DatasetSort = (typeof SORTS)[number]

export default function DatasetsPage() {
  const [allDatasets, setAllDatasets] = useState<DatasetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DatasetFilter>('all')
  const [sort, setSort] = useState<DatasetSort>('newest')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [original, synthetic] = await Promise.all([listDatasets(), listSyntheticDatasets()])
        const merged: DatasetRow[] = [
          ...original.map((row: any) => ({ ...row, type: 'original' as const })),
          ...synthetic.map((row: any) => ({ ...row, type: 'synthetic' as const })),
        ]
        setAllDatasets(merged)
      } catch (e: any) {
        toast.error('Failed to load datasets', {
          description: e?.response?.data?.detail ?? e?.message,
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const displayed = useMemo(() => {
    let rows = [...allDatasets]

    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter((d) => (d.name ?? '').toLowerCase().includes(q))

    if (filter !== 'all') rows = rows.filter((d) => d.type === filter)

    rows.sort((a, b) => {
      if (sort === 'most_rows') return (b.row_count ?? 0) - (a.row_count ?? 0)
      const left = new Date(a.created_at ?? 0).getTime()
      const right = new Date(b.created_at ?? 0).getTime()
      return sort === 'newest' ? right - left : left - right
    })

    return rows
  }, [allDatasets, query, filter, sort])

  const handleDelete = async (dataset: DatasetRow) => {
    if (dataset.type !== 'original') {
      toast.error('Synthetic deletion is not available yet')
      return
    }

    try {
      await deleteDataset(dataset.id)
      setAllDatasets((prev) => prev.filter((item) => item.id !== dataset.id))
      toast.success('Dataset deleted')
    } catch (e: any) {
      toast.error('Failed to delete dataset', {
        description: e?.response?.data?.detail ?? e?.message,
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-display font-bold text-text">My Datasets</h1>
        <Button asChild>
          <Link href="/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload New
          </Link>
        </Button>
      </header>

      <section className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by dataset name"
            className="w-full rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40"
          />
        </label>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as DatasetFilter)}
          className="rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white"
        >
          <option value="all">All</option>
          <option value="original">Original</option>
          <option value="synthetic">Synthetic</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as DatasetSort)}
          className="rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most_rows">Most Rows</option>
        </select>
      </section>

      {displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgba(167,139,250,0.22)] bg-[rgba(255,255,255,0.02)] p-12 text-center">
          <p className="text-lg font-medium text-text">No datasets found</p>
          <p className="mt-2 text-sm text-white/55">Try another search/filter or upload your first dataset.</p>
          <Button asChild className="mt-5">
            <Link href="/upload">Upload your first dataset</Link>
          </Button>
        </div>
      ) : (
        <DatasetTable datasets={displayed} onDelete={handleDelete} />
      )}
    </div>
  )
}
