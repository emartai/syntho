'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Database, Columns, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SchemaColumn {
  name: string;
  type: string;
  null_percentage?: number;
  sample_values?: unknown[];
}

interface SchemaPreviewProps {
  datasetId: string;
  datasetName: string;
  schema: SchemaColumn[];
  rowCount: number;
  columnCount: number;
  plan: 'free' | 'pro' | 'growth';
  onUploadDifferent: () => void;
}

const typeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  numeric: { label: 'Numeric', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  integer: { label: 'Numeric', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  float: { label: 'Numeric', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  categorical: { label: 'Categorical', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
  string: { label: 'Categorical', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
  datetime: { label: 'Datetime', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
  date: { label: 'Datetime', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
  boolean: { label: 'Boolean', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  bool: { label: 'Boolean', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  text: { label: 'Text', color: 'rgba(241,240,255,0.75)', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.30)' },
  object: { label: 'Text', color: 'rgba(241,240,255,0.75)', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.30)' },
};

function formatSampleValue(value: unknown) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value.length > 28 ? `${value.slice(0, 28)}...` : value;
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

export function SchemaPreview({
  datasetId,
  datasetName,
  schema,
  rowCount,
  columnCount,
  plan,
  onUploadDifferent,
}: SchemaPreviewProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[14px] p-5 border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[rgba(167,139,250,0.12)] flex items-center justify-center">
              <Database className="w-5 h-5 text-[#a78bfa]" />
            </div>
            <div>
              <p className="text-xs text-[rgba(241,240,255,0.65)]">Total Rows</p>
              <p className="text-2xl font-bold text-[#a78bfa]" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                {rowCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] p-5 border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[rgba(6,182,212,0.10)] flex items-center justify-center">
              <Columns className="w-5 h-5 text-[#06b6d4]" />
            </div>
            <div>
              <p className="text-xs text-[rgba(241,240,255,0.65)]">Total Columns</p>
              <p className="text-2xl font-bold text-[#06b6d4]" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                {columnCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {plan === 'free' && rowCount > 10_000 && (
        <div className="rounded-[14px] border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.12)] p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-[#f59e0b] mt-0.5" />
          <p className="text-sm text-[rgba(241,240,255,0.80)]">
            Free plan is capped at 10k rows — upgrade to Pro for larger datasets.
          </p>
        </div>
      )}

      <div className="rounded-[14px] border border-[rgba(167,139,250,0.10)] overflow-hidden bg-[rgba(255,255,255,0.04)]">
        <div className="p-5 border-b border-[rgba(167,139,250,0.10)]">
          <h3 className="text-lg font-semibold text-[#f1f0ff]" style={{ fontFamily: 'Clash Display, sans-serif' }}>
            Detected Schema
          </h3>
          <p className="text-sm text-[rgba(241,240,255,0.65)] mt-1">
            Review Column Name, Detected Type, Null %, and Sample Values.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(167,139,250,0.10)]">
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]">COLUMN NAME</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]">DETECTED TYPE</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]">NULL %</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]">SAMPLE VALUES</th>
              </tr>
            </thead>
            <tbody>
              {schema.map((column, index) => {
                const conf = typeConfig[column.type.toLowerCase()] ?? typeConfig.text;
                return (
                  <tr key={index} className="border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="py-3 px-5 text-sm font-semibold text-[#f1f0ff] font-mono">{column.name}</td>
                    <td className="py-3 px-5">
                      <span
                        style={{
                          background: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.border}`,
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        {conf.label}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-sm text-[rgba(241,240,255,0.65)]">
                      {column.null_percentage !== undefined ? `${column.null_percentage.toFixed(1)}%` : '0%'}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex flex-wrap gap-2">
                        {(column.sample_values?.length ?? 0) > 0 ? (
                          column.sample_values!.slice(0, 3).map((value, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded text-xs font-mono border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] text-[rgba(241,240,255,0.70)]"
                            >
                              {formatSampleValue(value)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[rgba(241,240,255,0.38)]">No samples</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[14px] border border-[rgba(167,139,250,0.10)] p-6 bg-[rgba(255,255,255,0.04)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[#f1f0ff] mb-1" style={{ fontFamily: 'Clash Display, sans-serif' }}>
              Ready to generate synthetic data?
            </h3>
            <p className="text-sm text-[rgba(241,240,255,0.65)]">
              Proceed with <span className="font-semibold text-[#a78bfa]">{datasetName}</span> or upload a different file.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onUploadDifferent}>Upload Different File</Button>
            <Button
              onClick={() => router.push(`/generate/${datasetId}`)}
              className="flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', color: '#f1f0ff' }}
            >
              Generate Synthetic Data
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
