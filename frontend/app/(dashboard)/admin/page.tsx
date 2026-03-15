'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { notFound } from 'next/navigation';
import { FLAGS } from '@/lib/flags';
import { Users, Database, Sparkles, CreditCard, Key, HardDrive, TrendingUp, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  if (!FLAGS.ADMIN_PANEL) notFound();

  const { user } = useAuth();
  const supabase = createClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/stats', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Admin Dashboard</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          Platform overview and statistics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.total_users || 0}
          subValue={`+${stats?.new_users_this_week || 0} this week`}
          color="#a78bfa"
        />
        <StatCard
          icon={Database}
          label="Total Datasets"
          value={stats?.total_datasets || 0}
          color="#06b6d4"
        />
        <StatCard
          icon={Sparkles}
          label="Total Generations"
          value={stats?.total_generations || 0}
          color="#22c55e"
        />
        <StatCard
          icon={CreditCard}
          label="Platform Revenue"
          value={`₦${(stats?.platform_revenue || 0).toLocaleString()}`}
          subValue={`${stats?.total_transactions || 0} transactions`}
          color="#f59e0b"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
              Active API Keys
            </CardTitle>
            <Key className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">
              {stats?.active_api_keys || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
              Storage Used
            </CardTitle>
            <HardDrive className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">
              {((stats?.storage_used_bytes || 0) / 1024 / 1024 / 1024).toFixed(2)} GB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">
              ₦{(stats?.total_revenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-[rgba(241,240,255,0.38)]">
              20% platform fee: ₦{(stats?.platform_revenue || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminCard title="User Management" href="/admin/users" icon={Users} />
        <AdminCard title="Marketplace Moderation" href="/admin/marketplace" icon={CreditCard} />
        <AdminCard title="Job Monitoring" href="/admin/jobs" icon={Sparkles} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
          {label}
        </CardTitle>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        {subValue && <p className="text-xs text-[rgba(241,240,255,0.38)]">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

function AdminCard({ title, href, icon: Icon }: { title: string; href: string; icon: any }) {
  return (
    <a href={href} className="block">
      <Card className="hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(167,139,250,0.10)] flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text">{title}</p>
              <p className="text-sm text-[rgba(241,240,255,0.38)]">Manage →</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}