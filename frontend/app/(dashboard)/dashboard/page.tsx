'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FREE_JOBS_QUOTA } from '@/lib/pricing';
import { Database, Sparkles, Activity, Clock, Upload, ArrowUpRight, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { StatCardSkeleton } from '@/components/shared/CardSkeleton';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

// ── helpers ──────────────────────────────────────────────────────────────────

const supabase = createClient();

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Queued',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  running:   { label: 'Running',    color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  completed: { label: 'Completed',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  failed:    { label: 'Failed',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {cfg.label}
    </span>
  );
}

function TrustScorePill({ score, label }: { score: number; label: string }) {
  const color =
    score >= 90 ? '#22c55e' :
    score >= 75 ? '#06b6d4' :
    score >= 60 ? '#f59e0b' :
                  '#ef4444';

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}
    >
      {Math.round(score)}
      <span className="font-normal opacity-70 text-[10px]">{label}</span>
    </span>
  );
}

// ── data fetchers ─────────────────────────────────────────────────────────────

async function fetchDashboardData(userId: string) {
  const [datasetsRes, syntheticRes, profileRes, recentJobsRes] = await Promise.all([
    supabase
      .from('datasets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('synthetic_datasets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('profiles')
      .select('plan, jobs_used_this_month')
      .eq('id', userId)
      .limit(1),
    supabase
      .from('synthetic_datasets')
      .select('id, status, progress, generation_method, error_message, created_at, datasets(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    totalDatasets: datasetsRes.count ?? 0,
    syntheticGenerated: syntheticRes.count ?? 0,
    profile: profileRes.data?.[0] ?? { plan: 'free', jobs_used_this_month: 0 },
    recentJobs: recentJobsRes.data ?? [],
  };
}

async function fetchTrustScores(syntheticIds: string[]) {
  if (syntheticIds.length === 0) return [];
  const { data } = await supabase
    .from('trust_scores')
    .select('synthetic_dataset_id, composite_score, label')
    .in('synthetic_dataset_id', syntheticIds);
  return data ?? [];
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div
      className="rounded-[14px] border border-[rgba(167,139,250,0.10)] p-5"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[rgba(241,240,255,0.65)]">{label}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
      </div>
      <div
        className="text-3xl font-bold mb-1"
        style={{ fontFamily: 'Clash Display, sans-serif', color: '#f1f0ff' }}
      >
        {value}
      </div>
      {sub && <p className="text-xs text-[rgba(241,240,255,0.38)]">{sub}</p>}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const completedJobIds = (data?.recentJobs ?? [])
    .filter((j: { status: string }) => j.status === 'completed')
    .map((j: { id: string }) => j.id);

  const { data: trustScores = [] } = useQuery({
    queryKey: ['trust-scores-dashboard', completedJobIds],
    queryFn: () => fetchTrustScores(completedJobIds),
    enabled: completedJobIds.length > 0,
    staleTime: 60_000,
  });

  const trustMap = Object.fromEntries(
    trustScores.map((t: { synthetic_dataset_id: string; composite_score: number; label: string }) => [
      t.synthetic_dataset_id,
      t,
    ])
  );

  const plan = data?.profile?.plan ?? 'free';
  const jobsUsed = data?.profile?.jobs_used_this_month ?? 0;
  const jobsRemaining = plan === 'free' ? Math.max(FREE_JOBS_QUOTA - jobsUsed, 0) : null;

  const hasNoDatasets = !isLoading && (data?.totalDatasets ?? 0) === 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[#f1f0ff]"
            style={{ fontFamily: 'Clash Display, sans-serif' }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-[rgba(241,240,255,0.50)] mt-1">
            Overview of your synthetic data activity
          </p>
        </div>
        <Link href="/upload">
          <Button className="flex items-center gap-2 bg-gradient-to-r from-[#a78bfa] to-[#06b6d4] text-white border-0 hover:brightness-110">
            <Upload className="w-4 h-4" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Database}
            label="Total Datasets"
            value={data?.totalDatasets ?? 0}
            sub="Uploaded datasets"
            iconColor="#a78bfa"
            iconBg="rgba(167,139,250,0.12)"
          />
          <StatCard
            icon={Sparkles}
            label="Synthetic Generated"
            value={data?.syntheticGenerated ?? 0}
            sub="Completed jobs"
            iconColor="#06b6d4"
            iconBg="rgba(6,182,212,0.12)"
          />
          <StatCard
            icon={Activity}
            label="Jobs This Month"
            value={jobsUsed}
            sub={plan === 'free' ? `of ${FREE_JOBS_QUOTA} free` : 'Unlimited plan'}
            iconColor="#f59e0b"
            iconBg="rgba(245,158,11,0.12)"
          />
          <StatCard
            icon={Clock}
            label="Jobs Remaining"
            value={jobsRemaining !== null ? jobsRemaining : '∞'}
            sub={plan === 'free' ? 'Resets 1st of month' : 'Pro/Growth plan'}
            iconColor={jobsRemaining === 0 ? '#ef4444' : '#22c55e'}
            iconBg={jobsRemaining === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'}
          />
        </div>
      )}

      {/* Empty state */}
      {hasNoDatasets && (
        <EmptyState
          icon="dataset"
          title="No datasets yet"
          description="Upload your first dataset to start generating privacy-safe synthetic data with a Trust Score and GDPR compliance PDF."
          actionLabel="Upload Your First Dataset"
          onAction={() => router.push('/upload')}
        />
      )}

      {/* Recent Jobs table */}
      {!hasNoDatasets && (
        <div
          className="rounded-[14px] border border-[rgba(167,139,250,0.10)] overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(167,139,250,0.08)]">
            <h2
              className="text-base font-semibold text-[#f1f0ff]"
              style={{ fontFamily: 'Clash Display, sans-serif' }}
            >
              Recent Jobs
            </h2>
            <Link
              href="/datasets"
              className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-5">
              <TableSkeleton columns={4} rows={5} />
            </div>
          ) : data?.recentJobs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[rgba(241,240,255,0.38)]">
              No generation jobs yet.{' '}
              <Link href="/datasets" className="text-[#a78bfa] hover:underline">
                Go to your datasets
              </Link>{' '}
              to start one.
            </div>
          ) : (
            <div className="divide-y divide-[rgba(167,139,250,0.06)]">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_110px_120px] gap-4 px-5 py-2.5 text-xs font-semibold text-[rgba(241,240,255,0.38)] uppercase tracking-wider">
                <span>Dataset</span>
                <span>Method</span>
                <span>Status</span>
                <span>Trust Score</span>
              </div>

              {(data?.recentJobs ?? []).map((job: {
                id: string;
                status: string;
                progress: number;
                generation_method: string;
                error_message?: string;
                created_at: string;
                datasets?: { name?: string } | null;
              }) => {
                const trust = trustMap[job.id];
                const datasetName = job.datasets?.name ?? 'Unknown dataset';
                const ago = formatDistanceToNow(new Date(job.created_at), { addSuffix: true });

                return (
                  <Link
                    key={job.id}
                    href={
                      job.status === 'completed'
                        ? `/datasets/${job.id}/results`
                        : job.status === 'running' || job.status === 'pending'
                        ? `/generate/${job.id}`
                        : '/datasets'
                    }
                    className="grid grid-cols-[1fr_120px_110px_120px] gap-4 px-5 py-3.5 hover:bg-[rgba(255,255,255,0.03)] transition-colors items-center"
                  >
                    {/* Dataset name + time */}
                    <div className="min-w-0">
                      <p className="text-sm text-[#f1f0ff] truncate">{datasetName}</p>
                      <p className="text-xs text-[rgba(241,240,255,0.35)] mt-0.5">{ago}</p>
                    </div>

                    {/* Method */}
                    <span className="text-xs text-[rgba(241,240,255,0.55)] capitalize">
                      {job.generation_method === 'gaussian_copula'
                        ? 'Gaussian Copula'
                        : 'CTGAN'}
                    </span>

                    {/* Status */}
                    <div>
                      <StatusBadge status={job.status} />
                      {job.status === 'running' && (
                        <p className="text-[10px] text-[rgba(241,240,255,0.35)] mt-0.5">
                          {job.progress}%
                        </p>
                      )}
                      {job.status === 'failed' && job.error_message && (
                        <p className="text-[10px] text-[#ef4444] mt-0.5 flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {job.error_message.slice(0, 30)}
                        </p>
                      )}
                    </div>

                    {/* Trust score */}
                    <div>
                      {trust ? (
                        <TrustScorePill score={trust.composite_score} label={trust.label} />
                      ) : job.status === 'completed' ? (
                        <span className="text-xs text-[rgba(241,240,255,0.25)]">Calculating…</span>
                      ) : (
                        <span className="text-xs text-[rgba(241,240,255,0.20)]">—</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {!hasNoDatasets && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/upload">
            <div
              className="flex items-center gap-4 p-4 rounded-[14px] border border-[rgba(167,139,250,0.10)] hover:border-[rgba(167,139,250,0.25)] hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgba(167,139,250,0.12)]">
                <Upload className="w-5 h-5 text-[#a78bfa]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#f1f0ff]">Upload Dataset</p>
                <p className="text-xs text-[rgba(241,240,255,0.45)]">Add a new dataset to generate from</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[rgba(241,240,255,0.30)]" />
            </div>
          </Link>

          <Link href="/datasets">
            <div
              className="flex items-center gap-4 p-4 rounded-[14px] border border-[rgba(167,139,250,0.10)] hover:border-[rgba(167,139,250,0.25)] hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgba(6,182,212,0.12)]">
                <Database className="w-5 h-5 text-[#06b6d4]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#f1f0ff]">View All Datasets</p>
                <p className="text-xs text-[rgba(241,240,255,0.45)]">Browse and manage your datasets</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[rgba(241,240,255,0.30)]" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
