'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Database, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SchemaColumn {
  name: string;
  type: string;
  null_percentage?: number;
  sample_values?: any[];
}

interface SchemaPreviewProps {
  datasetId: string;
  datasetName: string;
  schema: SchemaColumn[];
  rowCount: number;
  columnCount: number;
}

const typeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  numeric: { label: 'Numeric', color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)' },
  integer: { label: 'Integer', color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)' },
  float: { label: 'Float', color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)' },
  categorical: { label: 'Categorical', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
  string: { label: 'Categorical', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
  datetime: { label: 'Datetime', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)' },
  date: { label: 'Date', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)' },
  boolean: { label: 'Boolean', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  bool: { label: 'Boolean', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  text: { label: 'Text', color: 'rgba(241,240,255,0.65)', bg: 'rgba(241,240,255,0.06)', border: 'rgba(241,240,255,0.1)' },
  object: { label: 'Text', color: 'rgba(241,240,255,0.65)', bg: 'rgba(241,240,255,0.06)', border: 'rgba(241,240,255,0.1)' },
};

export function SchemaPreview({ datasetId, datasetName, schema, rowCount, columnCount }: SchemaPreviewProps) {
  const router = useRouter();

  const getTypeConfig = (type: string) => {
    const normalizedType = type.toLowerCase();
    return typeConfig[normalizedType] || typeConfig.text;
  };

  const formatSampleValue = (value: any) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value.length > 30 ? value.slice(0, 30) + '...' : value;
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'boolean') return value.toString();
    return JSON.stringify(value);
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          className="relative rounded-[14px] p-5 border border-[rgba(167,139,250,0.10)]"
          style={{ 
            background: 'rgba(255,255,255,0.04)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)' 
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.12)' }}
            >
              <Database className="w-5 h-5 text-[#a78bfa]" />
            </div>
            <div>
              <p className="text-xs text-[rgba(241,240,255,0.65)]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                Total Rows
              </p>
              <p className="text-2xl font-bold text-[#a78bfa]" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                {rowCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="relative rounded-[14px] p-5 border border-[rgba(167,139,250,0.10)]"
          style={{ 
            background: 'rgba(255,255,255,0.04)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)' 
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.10)' }}
            >
              <Columns className="w-5 h-5 text-[#06b6d4]" />
            </div>
            <div>
              <p className="text-xs text-[rgba(241,240,255,0.65)]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                Total Columns
              </p>
              <p className="text-2xl font-bold text-[#06b6d4]" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                {columnCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schema table */}
      <div 
        className="relative rounded-[14px] border border-[rgba(167,139,250,0.10)] overflow-hidden"
        style={{ 
          background: 'rgba(255,255,255,0.04)', 
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)' 
        }}
      >
        <div className="p-5 border-b border-[rgba(167,139,250,0.10)]">
          <h3 className="text-lg font-semibold text-[#f1f0ff]" style={{ fontFamily: 'Clash Display, sans-serif' }}>
            Detected Schema
          </h3>
          <p className="text-sm text-[rgba(241,240,255,0.65)] mt-1">
            Review the automatically detected column types and sample values
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(167,139,250,0.10)]">
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                  COLUMN NAME
                </th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]">
                  DETECTED TYPE
                </th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]">
                  NULL %
                </th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-[rgba(241,240,255,0.65)]">
                  SAMPLE VALUES
                </th>
              </tr>
            </thead>
            <tbody>
              {schema.map((column, index) => {
                const typeConf = getTypeConfig(column.type);
                return (
                  <tr 
                    key={index}
                    className="border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    <td className="py-3 px-5">
                      <span className="text-sm font-semibold text-[#f1f0ff] font-mono">
                        {column.name}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span 
                        style={{ 
                          background: typeConf.bg, 
                          color: typeConf.color, 
                          border: `1px solid ${typeConf.border}`, 
                          padding: '3px 10px', 
                          borderRadius: 20, 
                          fontSize: 11, 
                          fontWeight: 600, 
                          fontFamily: 'Satoshi, sans-serif', 
                          display: 'inline-block' 
                        }}
                      >
                        {typeConf.label}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-sm text-[rgba(241,240,255,0.65)]">
                        {column.null_percentage !== undefined 
                          ? `${column.null_percentage.toFixed(1)}%` 
                          : '0%'}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex flex-wrap gap-2">
                        {column.sample_values && column.sample_values.length > 0 ? (
                          column.sample_values.slice(0, 3).map((value, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 rounded text-xs font-mono"
                              style={{ 
                                background: 'rgba(255,255,255,0.04)', 
                                color: 'rgba(241,240,255,0.65)',
                                border: '1px solid rgba(167,139,250,0.10)'
                              }}
                            >
                              {formatSampleValue(value)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[rgba(241,240,255,0.38)]">
                            No samples
                          </span>
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

      {/* Action button */}
      <div 
        className="relative rounded-[14px] p-6 border border-[rgba(167,139,250,0.10)]"
        style={{ 
          background: 'rgba(255,255,255,0.04)', 
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)' 
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[#f1f0ff] mb-1" style={{ fontFamily: 'Clash Display, sans-serif' }}>
              Schema looks correct?
            </h3>
            <p className="text-sm text-[rgba(241,240,255,0.65)]">
              Proceed to generate synthetic data from <span className="font-semibold text-[#a78bfa]">{datasetName}</span>
            </p>
          </div>
          <Button
            onClick={() => router.push(`/generate/${datasetId}`)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
            style={{ 
              background: 'linear-gradient(135deg, #a78bfa, #06b6d4)',
              color: '#f1f0ff'
            }}
          >
            Generate Synthetic Data
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
