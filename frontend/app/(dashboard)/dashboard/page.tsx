'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database, Sparkles, Activity, DollarSign, Upload, Store, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Dataset, SyntheticDataset } from '@/types';

interface DashboardStats {
  totalDatasets: number;
  syntheticGenerated: number;
  apiCallsThisMonth: number;
  revenueEarned: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDatasets: 0,
    syntheticGenerated: 0,
    apiCallsThisMonth: 0,
    revenueEarned: 0,
  });
  const [recentDatasets, setRecentDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      console.log('Dashboard: Fetching data for user', user.id);
      const supabase = createClient();

      try {
        // Run queries in parallel for better performance
        const [
          datasetsCountRes,
          syntheticCountRes,
          apiKeysRes,
          purchasesRes,
          recentDatasetsRes
        ] = await Promise.all([
          // 1. Total datasets count
          supabase
            .from('datasets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          // 2. Synthetic datasets count
          supabase
            .from('synthetic_datasets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'completed'),
          
          // 3. API keys usage
          supabase
            .from('api_keys')
            .select('usage_count')
            .eq('user_id', user.id),
          
          // 4. Revenue from purchases
          supabase
            .from('purchases')
            .select('amount')
            .eq('buyer_id', user.id)
            .eq('status', 'completed'),
          
          // 5. Recent datasets
          supabase
            .from('datasets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        // Validate results and handle potential errors individually if needed
        if (datasetsCountRes.error) console.error('Dashboard: Datasets error', datasetsCountRes.error);
        if (syntheticCountRes.error) console.error('Dashboard: Synthetic error', syntheticCountRes.error);

        const totalApiCalls = apiKeysRes.data?.reduce((sum, key) => sum + (key.usage_count || 0), 0) || 0;
        const totalRevenue = purchasesRes.data?.reduce((sum, purchase) => sum + (purchase.amount || 0), 0) || 0;

        setStats({
          totalDatasets: datasetsCountRes.count || 0,
          syntheticGenerated: syntheticCountRes.count || 0,
          apiCallsThisMonth: totalApiCalls,
          revenueEarned: totalRevenue,
        });

        setRecentDatasets(recentDatasetsRes.data || []);
        console.log('Dashboard: Data fetching complete');
      } catch (error) {
        console.error('Dashboard: Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a78bfa] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Total Datasets"
          value={stats.totalDatasets}
          iconColor="#a78bfa"
          iconBg="rgba(167,139,250,0.12)"
        />
        <StatCard
          icon={Sparkles}
          label="Synthetic Generated"
          value={stats.syntheticGenerated}
          iconColor="#06b6d4"
          iconBg="rgba(6,182,212,0.10)"
        />
        <StatCard
          icon={Activity}
          label="API Calls This Month"
          value={stats.apiCallsThisMonth}
          iconColor="#22c55e"
          iconBg="rgba(34,197,94,0.10)"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue Earned"
          value={`₦${stats.revenueEarned.toLocaleString()}`}
          iconColor="#f59e0b"
          iconBg="rgba(245,158,11,0.10)"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/upload">
          <div 
            className="relative rounded-[14px] p-6 transition-all duration-200 border border-[rgba(167,139,250,0.10)] hover:border-[rgba(167,139,250,0.22)] hover:bg-[rgba(255,255,255,0.07)] cursor-pointer group"
            style={{ 
              background: 'rgba(255,255,255,0.04)', 
              backdropFilter: 'blur(20px)', 
              WebkitBackdropFilter: 'blur(20px)' 
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(167,139,250,0.12)' }}
              >
                <Upload className="w-6 h-6 text-[#a78bfa]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#f1f0ff] mb-1" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                  Upload Dataset
                </h3>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">
                  Upload a new dataset to generate synthetic data
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-[rgba(241,240,255,0.38)] group-hover:text-[#a78bfa] transition-colors" />
            </div>
          </div>
        </Link>

        <Link href="/marketplace">
          <div 
            className="relative rounded-[14px] p-6 transition-all duration-200 border border-[rgba(167,139,250,0.10)] hover:border-[rgba(167,139,250,0.22)] hover:bg-[rgba(255,255,255,0.07)] cursor-pointer group"
            style={{ 
              background: 'rgba(255,255,255,0.04)', 
              backdropFilter: 'blur(20px)', 
              WebkitBackdropFilter: 'blur(20px)' 
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(6,182,212,0.10)' }}
              >
                <Store className="w-6 h-6 text-[#06b6d4]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#f1f0ff] mb-1" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                  Browse Marketplace
                </h3>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">
                  Discover and purchase synthetic datasets
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-[rgba(241,240,255,0.38)] group-hover:text-[#06b6d4] transition-colors" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent datasets */}
      <div 
        className="relative rounded-[14px] p-6 border border-[rgba(167,139,250,0.10)]"
        style={{ 
          background: 'rgba(255,255,255,0.04)', 
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)' 
        }}
      >
        <h2 className="text-lg font-semibold text-[#f1f0ff] mb-4" style={{ fontFamily: 'Clash Display, sans-serif' }}>
          Recent Datasets
        </h2>

        {recentDatasets.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-[rgba(241,240,255,0.20)] mx-auto mb-3" />
            <p className="text-[rgba(241,240,255,0.65)] mb-4">No datasets yet</p>
            <Link 
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #a78bfa, #06b6d4)',
                color: '#f1f0ff'
              }}
            >
              <Upload className="w-4 h-4" />
              Upload Your First Dataset
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(167,139,250,0.10)]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[rgba(241,240,255,0.65)]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                    NAME
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[rgba(241,240,255,0.65)]">
                    STATUS
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[rgba(241,240,255,0.65)]">
                    ROWS
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[rgba(241,240,255,0.65)]">
                    COLUMNS
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[rgba(241,240,255,0.65)]">
                    UPLOADED
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentDatasets.map((dataset) => (
                  <tr 
                    key={dataset.id}
                    className="border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link 
                        href={`/datasets/${dataset.id}`}
                        className="text-sm text-[#f1f0ff] hover:text-[#a78bfa] transition-colors font-medium"
                      >
                        {dataset.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={dataset.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                      {dataset.row_count?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                      {dataset.column_count || 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                      {formatDistanceToNow(new Date(dataset.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentDatasets.length > 0 && (
          <div className="mt-4 text-center">
            <Link 
              href="/datasets"
              className="text-sm text-[#a78bfa] hover:text-[#c4b5fd] transition-colors font-semibold"
            >
              View all datasets →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  iconColor, 
  iconBg 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  iconColor: string; 
  iconBg: string;
}) {
  return (
    <div 
      className="relative rounded-[14px] p-5 border border-[rgba(167,139,250,0.10)]"
      style={{ 
        background: 'rgba(255,255,255,0.04)', 
        backdropFilter: 'blur(20px)', 
        WebkitBackdropFilter: 'blur(20px)' 
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ fontFamily: 'Clash Display, sans-serif', color: iconColor }}>
        {value}
      </div>
      <div className="text-xs text-[rgba(241,240,255,0.65)]" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; color: string; border: string }> = {
    uploaded: { label: 'Uploaded', bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
    processing: { label: 'Processing', bg: 'rgba(6,182,212,0.10)', color: '#06b6d4', border: 'rgba(6,182,212,0.25)' },
    ready: { label: 'Ready', bg: 'rgba(34,197,94,0.10)', color: '#22c55e', border: 'rgba(34,197,94,0.25)' },
    error: { label: 'Error', bg: 'rgba(239,68,68,0.10)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  };

  const { label, bg, color, border } = config[status] || config.uploaded;

  return (
    <span 
      style={{ 
        background: bg, 
        color, 
        border: `1px solid ${border}`, 
        padding: '3px 10px', 
        borderRadius: 20, 
        fontSize: 11, 
        fontWeight: 600, 
        fontFamily: 'Satoshi, sans-serif', 
        display: 'inline-block' 
      }}
    >
      {label}
    </span>
  );
}
