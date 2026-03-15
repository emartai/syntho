'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartDataPoint {
  name: string;
  datasets: number;
  synthetic: number;
}

interface DistributionDataPoint {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  chartData: ChartDataPoint[];
  distributionData: DistributionDataPoint[];
  colors: string[];
}

export default function DashboardCharts({ chartData, distributionData, colors }: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {/* Activity Chart */}
      <Card className="col-span-4 bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
        <CardHeader>
          <CardTitle className="text-text">Activity Overview</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.10)" />
                <XAxis dataKey="name" stroke="rgba(241,240,255,0.38)" />
                <YAxis stroke="rgba(241,240,255,0.38)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,10,30,0.95)',
                    border: '1px solid rgba(167,139,250,0.20)',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="datasets" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="synthetic" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Chart */}
      <Card className="col-span-3 bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
        <CardHeader>
          <CardTitle className="text-text">Data Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15,10,30,0.95)',
                    border: '1px solid rgba(167,139,250,0.20)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {distributionData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span className="text-xs text-[rgba(241,240,255,0.65)]">{item.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
