'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DistributionDatum {
  label: string;
  original: number;
  synthetic: number;
}

interface DistributionChartProps {
  columnName: string;
  data: DistributionDatum[];
  type: 'numeric' | 'categorical';
}

export function DistributionChart({ columnName, data, type }: DistributionChartProps) {
  if (!data.length) {
    return <p className="text-sm text-text-2">No distribution data available for {columnName}.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 44 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(241,240,255,0.12)" />
          <XAxis
            dataKey="label"
            angle={-25}
            textAnchor="end"
            interval={0}
            height={60}
            tick={{ fill: '#c5c6d0', fontSize: 11 }}
            label={{ value: type === 'numeric' ? 'Bins' : 'Categories', position: 'insideBottom', offset: -24 }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#c5c6d0', fontSize: 11 }}
            label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 8,
              color: '#f1f0ff',
            }}
          />
          <Legend />
          <Bar dataKey="original" name="Original" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="synthetic" name="Synthetic" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
