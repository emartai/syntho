'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database, Sparkles, Plus, Search, Filter, ArrowUpDown, Trash2, Play, Download } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatasetTable } from '@/components/datasets/DatasetTable';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type TabType = 'originals' | 'synthetic';

export default function DatasetsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabType>('originals');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');

  const { data: originals, isLoading: originalsLoading } = useQuery({
    queryKey: ['datasets', 'original'],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: synthetic, isLoading: syntheticLoading } = useQuery({
    queryKey: ['datasets', 'synthetic'],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('synthetic_datasets')
        .select('*, datasets(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleDeleteOriginal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) return;
    try {
      await api.datasets.delete(id);
      toast.success('Dataset deleted');
    } catch (error: any) {
      toast.error('Failed to delete', { description: error?.response?.data?.detail || error.message });
    }
  };

  const handleDeleteSynthetic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this synthetic dataset?')) return;
    try {
      await api.synthetic.cancel(id);
      toast.success('Synthetic dataset deleted');
    } catch (error: any) {
      toast.error('Failed to delete', { description: error?.response?.data?.detail || error.message });
    }
  };

  const filterAndSort = <T extends { name?: string; created_at: string; file_size?: number; status: string }>(
    items: T[],
    searchTerm: string,
    status: string,
    sort: string
  ) => {
    let filtered = items;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => (item.name || '').toLowerCase().includes(term));
    }
    if (status !== 'all') {
      filtered = filtered.filter(item => item.status === status);
    }
    filtered.sort((a, b) => {
      if (sort === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'size') return (b.file_size || 0) - (a.file_size || 0);
      return 0;
    });
    return filtered;
  };

  const filteredOriginals = filterAndSort(originals || [], search, statusFilter, sortBy);
  const filteredSynthetic = filterAndSort(synthetic || [], search, statusFilter, sortBy);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-text">Datasets</h1>
          <p className="text-sm text-[rgba(241,240,255,0.65)]">
            Manage your original and synthetic datasets
          </p>
        </div>
        <Link href="/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(241,240,255,0.38)]" />
              <Input
                placeholder="Search datasets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] text-sm"
              >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="error">Error</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
              </select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList>
              <TabsTrigger value="originals" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Originals ({originals?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="synthetic" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Synthetic ({synthetic?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="originals" className="mt-4">
              {originalsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredOriginals.length === 0 ? (
                <EmptyState type="original" />
              ) : (
                <DatasetTable
                  datasets={filteredOriginals}
                  type="original"
                  onDelete={handleDeleteOriginal}
                />
              )}
            </TabsContent>

            <TabsContent value="synthetic" className="mt-4">
              {syntheticLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredSynthetic.length === 0 ? (
                <EmptyState type="synthetic" />
              ) : (
                <DatasetTable
                  datasets={filteredSynthetic}
                  type="synthetic"
                  onDelete={handleDeleteSynthetic}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ type }: { type: 'original' | 'synthetic' }) {
  return (
    <div className="text-center py-12">
      <Database className="h-12 w-12 text-[rgba(241,240,255,0.20)] mx-auto mb-3" />
      <p className="text-[rgba(241,240,255,0.65)] mb-4">
        {type === 'original' ? 'No datasets uploaded yet' : 'No synthetic datasets generated yet'}
      </p>
      {type === 'original' && (
        <Link href="/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Your First Dataset
          </Button>
        </Link>
      )}
    </div>
  );
}