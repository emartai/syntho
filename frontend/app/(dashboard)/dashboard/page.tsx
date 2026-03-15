'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database, Sparkles, Activity, DollarSign, Upload, Store, ArrowUpRight, FileText } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Lazy-load recharts to avoid bloating the initial JS bundle
const DashboardCharts = dynamic(
  () => import('@/components/shared/DashboardCharts'),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-white/5" /> }
);

interface DashboardStats {
  totalDatasets: number;
  syntheticGenerated: number;
  apiCallsThisMonth: number;
  revenueEarned: number;
}

interface ActivityItem {
  id: string;
  type: 'upload' | 'generation' | 'purchase' | 'api_call';
  title: string;
  description: string;
  timestamp: string;
}

const COLORS = ['#a78bfa', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

const CHART_DATA = [
  { name: 'Mon', datasets: 2, synthetic: 1 },
  { name: 'Tue', datasets: 3, synthetic: 2 },
  { name: 'Wed', datasets: 1, synthetic: 3 },
  { name: 'Thu', datasets: 4, synthetic: 2 },
  { name: 'Fri', datasets: 2, synthetic: 4 },
  { name: 'Sat', datasets: 1, synthetic: 1 },
  { name: 'Sun', datasets: 2, synthetic: 2 },
];

const DISTRIBUTION_DATA = [
  { name: 'Healthcare', value: 35 },
  { name: 'Finance', value: 25 },
  { name: 'Ecommerce', value: 20 },
  { name: 'IoT', value: 12 },
  { name: 'Other', value: 8 },
];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({
    totalDatasets: 0,
    syntheticGenerated: 0,
    apiCallsThisMonth: 0,
    revenueEarned: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || authLoading) return;

      try {
        setIsLoading(true);

        const [datasetsRes, syntheticRes, apiKeysRes, purchasesRes] = await Promise.all([
          supabase.from('datasets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('synthetic_datasets').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
          supabase.from('api_keys').select('usage_count').eq('user_id', user.id),
          supabase.from('purchases').select('amount,status').eq('buyer_id', user.id).eq('status', 'completed'),
        ]);

        const totalDatasets = datasetsRes.count ?? 0;
        const syntheticGenerated = syntheticRes.count ?? 0;
        const apiCallsThisMonth = apiKeysRes.data?.reduce((sum, key) => sum + (key.usage_count ?? 0), 0) ?? 0;
        const revenueEarned = purchasesRes.data?.reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0) ?? 0;

        setStats({ totalDatasets, syntheticGenerated, apiCallsThisMonth, revenueEarned });

        const activities: ActivityItem[] = [];
        if (totalDatasets > 0) {
          activities.push({
            id: '1',
            type: 'upload',
            title: 'Dataset uploaded',
            description: `${totalDatasets} dataset${totalDatasets > 1 ? 's' : ''} in your library`,
            timestamp: new Date().toISOString(),
          });
        }
        if (syntheticGenerated > 0) {
          activities.push({
            id: '2',
            type: 'generation',
            title: 'Synthetic data generated',
            description: `${syntheticGenerated} synthetic dataset${syntheticGenerated > 1 ? 's' : ''} created`,
            timestamp: new Date().toISOString(),
          });
        }
        setActivity(activities);
      } catch {
        // Network error — keep zeros, user can refresh
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, authLoading, supabase]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-[rgba(241,240,255,0.65)]">Please sign in to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Dashboard</h1>
          <p className="text-sm text-[rgba(241,240,255,0.65)] mt-1">
            Welcome back! Here&apos;s an overview of your synthetic data activity.
          </p>
        </div>
        <Link href="/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">Total Datasets</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{isLoading ? '—' : stats.totalDatasets}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">Uploaded datasets</p>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">Synthetic Generated</CardTitle>
            <Sparkles className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{isLoading ? '—' : stats.syntheticGenerated}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">Synthetic datasets created</p>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{isLoading ? '—' : stats.apiCallsThisMonth.toLocaleString()}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">This month</p>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">₦{isLoading ? '—' : stats.revenueEarned.toLocaleString()}</div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">Total earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts — lazy-loaded to keep initial bundle small */}
      <DashboardCharts chartData={CHART_DATA} distributionData={DISTRIBUTION_DATA} colors={COLORS} />

      {/* Recent Activity */}
      <Card className="bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
        <CardHeader>
          <CardTitle className="text-text">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[rgba(241,240,255,0.38)]">No activity yet. Upload your first dataset to get started!</p>
              <Link href="/upload" className="mt-4 inline-block">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Dataset
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.type === 'upload' ? 'bg-[rgba(167,139,250,0.20)]' :
                    item.type === 'generation' ? 'bg-[rgba(6,182,212,0.20)]' :
                    item.type === 'purchase' ? 'bg-[rgba(34,197,94,0.20)]' :
                    'bg-[rgba(245,158,11,0.20)]'
                  }`}>
                    {item.type === 'upload' && <Upload className="h-5 w-5 text-primary" />}
                    {item.type === 'generation' && <Sparkles className="h-5 w-5 text-accent" />}
                    {item.type === 'purchase' && <DollarSign className="h-5 w-5 text-success" />}
                    {item.type === 'api_call' && <Activity className="h-5 w-5 text-warning" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{item.title}</p>
                    <p className="text-xs text-[rgba(241,240,255,0.38)]">{item.description}</p>
                  </div>
                  <span className="text-xs text-[rgba(241,240,255,0.38)]">
                    {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/datasets">
          <Card className="cursor-pointer hover:bg-[rgba(255,255,255,0.07)] transition-colors bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="w-12 h-12 rounded-lg bg-[rgba(167,139,250,0.20)] flex items-center justify-center">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-text">View Datasets</p>
                <p className="text-sm text-[rgba(241,240,255,0.38)]">Manage your datasets</p>
              </div>
              <ArrowUpRight className="h-4 w-4 ml-auto text-[rgba(241,240,255,0.38)]" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/marketplace">
          <Card className="cursor-pointer hover:bg-[rgba(255,255,255,0.07)] transition-colors bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="w-12 h-12 rounded-lg bg-[rgba(6,182,212,0.20)] flex items-center justify-center">
                <Store className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="font-medium text-text">Marketplace</p>
                <p className="text-sm text-[rgba(241,240,255,0.38)]">Browse synthetic data</p>
              </div>
              <ArrowUpRight className="h-4 w-4 ml-auto text-[rgba(241,240,255,0.38)]" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/api-keys">
          <Card className="cursor-pointer hover:bg-[rgba(255,255,255,0.07)] transition-colors bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)]">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="w-12 h-12 rounded-lg bg-[rgba(34,197,94,0.20)] flex items-center justify-center">
                <FileText className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-medium text-text">API Keys</p>
                <p className="text-sm text-[rgba(241,240,255,0.38)]">Manage API access</p>
              </div>
              <ArrowUpRight className="h-4 w-4 ml-auto text-[rgba(241,240,255,0.38)]" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
