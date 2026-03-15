'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, Filter, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Listing {
  id: string;
  title: string;
  seller_id: string;
  seller_email: string;
  price: number;
  download_count: number;
  is_active: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  category: string | null;
  created_at: string;
}

export default function AdminMarketplacePage() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const { data: listings, isLoading } = useQuery({
    queryKey: ['admin-listings', activeTab, search],
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const params = new URLSearchParams();
      if (activeTab === 'flagged') params.append('is_flagged', 'true');
      else if (activeTab === 'active') params.append('is_active', 'true');
      else if (activeTab === 'inactive') params.append('is_active', 'false');
      
      const response = await fetch(`/api/v1/admin/marketplace?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch listings');
      return response.json() as Promise<Listing[]>;
    },
    enabled: !!user,
  });

  const deactivateMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/v1/admin/marketplace/${listingId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Deactivated by admin' }),
      });
      if (!response.ok) throw new Error('Failed to deactivate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      toast.success('Listing deactivated');
    },
    onError: (error: any) => {
      toast.error('Failed to deactivate', { description: error.message });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/v1/admin/marketplace/${listingId}/activate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to activate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      toast.success('Listing activated');
    },
    onError: (error: any) => {
      toast.error('Failed to activate', { description: error.message });
    },
  });

  const filteredListings = listings?.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.seller_email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Marketplace Moderation</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          Review and moderate marketplace listings
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(241,240,255,0.38)]" />
              <Input
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
              <TabsTrigger value="flagged" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Flagged
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-12 text-[rgba(241,240,255,0.38)]">
                  No listings found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(167,139,250,0.10)]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Listing</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Seller</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Price</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Downloads</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Created</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.map((listing) => (
                        <tr 
                          key={listing.id} 
                          className={`border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.02)] ${listing.is_flagged ? 'bg-[rgba(251,191,36,0.05)]' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {listing.is_flagged && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                              <span className="font-medium text-text">{listing.title}</span>
                            </div>
                            {listing.flag_reason && (
                              <p className="text-xs text-yellow-400 mt-1">Flagged: {listing.flag_reason}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">{listing.seller_email}</td>
                          <td className="py-3 px-4 font-medium text-primary">₦{listing.price.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">{listing.download_count}</td>
                          <td className="py-3 px-4">
                            <Badge variant={listing.is_active ? 'default' : 'secondary'}>
                              {listing.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              {listing.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                            {format(new Date(listing.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {listing.is_active ? (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-400"
                                  onClick={() => deactivateMutation.mutate(listing.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-green-400"
                                  onClick={() => activateMutation.mutate(listing.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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