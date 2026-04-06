'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Play, Trash2, Download, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { api, downloadOriginalDataset, downloadSynthetic } from '@/lib/api';
import { toast } from 'sonner';

interface DatasetTableProps {
  datasets: any[];
  type: 'original' | 'synthetic';
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  uploaded: { bg: 'rgba(167,139,250,0.10)', text: '#a78bfa', border: 'rgba(167,139,250,0.20)' },
  ready: { bg: 'rgba(34,197,94,0.10)', text: '#22c55e', border: 'rgba(34,197,94,0.20)' },
  processing: { bg: 'rgba(6,182,212,0.10)', text: '#06b6d4', border: 'rgba(6,182,212,0.20)' },
  error: { bg: 'rgba(239,68,68,0.10)', text: '#ef4444', border: 'rgba(239,68,68,0.20)' },
  pending: { bg: 'rgba(251,191,36,0.10)', text: '#f59e0b', border: 'rgba(251,191,36,0.20)' },
  running: { bg: 'rgba(6,182,212,0.10)', text: '#06b6d4', border: 'rgba(6,182,212,0.20)' },
  completed: { bg: 'rgba(34,197,94,0.10)', text: '#22c55e', border: 'rgba(34,197,94,0.20)' },
  failed: { bg: 'rgba(239,68,68,0.10)', text: '#ef4444', border: 'rgba(239,68,68,0.20)' },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.uploaded;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DatasetTable({ datasets, type, onDelete }: DatasetTableProps) {
  const handleDownload = async (id: string) => {
    try {
      const url = type === 'original' ? await downloadOriginalDataset(id) : await downloadSynthetic(id);
      if (!url) {
        toast.error('Download not available');
        return;
      }
      const response = await api.datasets.get(id);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data?.name ?? `dataset-${id}`;
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      toast.error('Failed to get download link', {
        description: error?.response?.data?.detail || error?.message,
      });
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgba(167,139,250,0.10)]">
            <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Name</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Size</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Rows</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Columns</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Created</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => (
            <tr
              key={dataset.id}
              className="border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.02)]"
            >
              <td className="py-3 px-4">
                <Link
                  href={`/datasets/${dataset.id}`}
                  className="font-medium text-text hover:text-primary transition-colors"
                >
                  {dataset.name || `Dataset ${dataset.id.slice(0, 8)}`}
                </Link>
                {type === 'synthetic' && dataset.datasets?.name && (
                  <p className="text-xs text-[rgba(241,240,255,0.38)] truncate max-w-[200px]">
                    From: {dataset.datasets.name}
                  </p>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                {formatFileSize(dataset.file_size || 0)}
              </td>
              <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                {dataset.row_count?.toLocaleString() || '-'}
              </td>
              <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                {dataset.column_count || '-'}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={dataset.status} />
              </td>
              <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                {format(new Date(dataset.created_at), 'MMM d, yyyy')}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/datasets/${dataset.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {type === 'original' && dataset.status === 'ready' && (
                    <Link href={`/generate/${dataset.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Play className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(dataset.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                    onClick={() => onDelete(dataset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
