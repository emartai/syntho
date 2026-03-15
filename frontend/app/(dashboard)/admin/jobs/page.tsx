'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, Filter, Play, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Job {
  id: string;
  user_id: string;
  user_email: string;
  dataset_id: string;
  dataset_name: string;
  generation_method: string;
  status: string;
  progress: number;
  error_message: string | null;
  started_at: string;
  duration_seconds: number | null;
}

export default function AdminJobsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['admin-jobs', statusFilter],
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status_filter', statusFilter);
      
      const response = await fetch(`/api/v1/admin/jobs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json() as Promise<Job[]>;
    },
    enabled: !!user,
  });

  const rerunMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/v1/admin/jobs/${jobId}/rerun`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to rerun job');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
      toast.success('Job re-triggered successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to rerun job', { description: error.message });
    },
  });

  const filteredJobs = jobs?.filter(j =>
    j.dataset_name.toLowerCase().includes(search.toLowerCase()) ||
    j.user_email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const failedJobs = filteredJobs.filter(j => j.status === 'failed');
  const runningJobs = filteredJobs.filter(j => j.status === 'running');
  const completedJobs = filteredJobs.filter(j => j.status === 'completed');

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string; icon: any }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      running: { variant: 'default', label: 'Running', icon: RefreshCw },
      completed: { variant: 'default', label: 'Completed', icon: CheckCircle },
      failed: { variant: 'destructive', label: 'Failed', icon: AlertCircle },
    };
    const c = config[status] || config.pending;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <c.icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Job Monitoring</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          Monitor and manage generation jobs
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-text">{runningJobs.length}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Running</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-text">{completedJobs.length}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-text">{failedJobs.length}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-text">{filteredJobs.length}</p>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {failedJobs.length > 0 && (
        <Card className="border-red-400/20">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Failed Jobs ({failedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.10)]">
                  <div className="flex-1">
                    <p className="font-medium text-text">{job.dataset_name}</p>
                    <p className="text-xs text-[rgba(241,240,255,0.38)]">{job.user_email}</p>
                    <p className="text-xs text-red-400 mt-1">{job.error_message || 'Unknown error'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rerunMutation.mutate(job.id)}
                    disabled={rerunMutation.isPending}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Re-run
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(241,240,255,0.38)]" />
              <Input
                placeholder="Search by dataset or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] text-sm"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All ({filteredJobs.length})</TabsTrigger>
              <TabsTrigger value="running">Running ({runningJobs.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({failedJobs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12 text-[rgba(241,240,255,0.38)]">
                  No jobs found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(167,139,250,0.10)]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Dataset</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">User</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Method</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Progress</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Duration</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job) => (
                        <tr key={job.id} className="border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.02)]">
                          <td className="py-3 px-4">
                            <p className="font-medium text-text">{job.dataset_name}</p>
                            <p className="text-xs text-[rgba(241,240,255,0.38)]">{format(new Date(job.started_at), 'MMM d, HH:mm')}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">{job.user_email}</td>
                          <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)] capitalize">{job.generation_method}</td>
                          <td className="py-3 px-4 w-32">
                            {job.status === 'running' ? (
                              <div className="flex items-center gap-2">
                                <Progress value={job.progress} className="h-2 flex-1" />
                                <span className="text-xs w-8">{job.progress}%</span>
                              </div>
                            ) : (
                              <span className="text-sm text-[rgba(241,240,255,0.38)]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(job.status)}</td>
                          <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                            {job.duration_seconds ? `${Math.floor(job.duration_seconds / 60)}m ${job.duration_seconds % 60}s` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {job.status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => rerunMutation.mutate(job.id)}
                                disabled={rerunMutation.isPending}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Re-run
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}