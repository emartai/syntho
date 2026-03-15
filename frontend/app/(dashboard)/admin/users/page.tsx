'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { notFound } from 'next/navigation';
import { FLAGS } from '@/lib/flags';
import { Search, Filter, MoreVertical, Shield, UserX, Eye, Crown } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  dataset_count: number;
  api_key_count: number;
  created_at: string;
}

export default function AdminUsersPage() {
  if (!FLAGS.ADMIN_PANEL) notFound();

  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async () => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      
      const response = await fetch(`/api/v1/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json() as Promise<User[]>;
    },
    enabled: !!user,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update user', { description: error.message });
    },
  });

  const handlePromote = (userId: string) => {
    updateUserMutation.mutate({ userId, data: { role: 'admin' } });
  };

  const handleDemote = (userId: string) => {
    updateUserMutation.mutate({ userId, data: { role: 'user' } });
  };

  const handleSuspend = (userId: string) => {
    updateUserMutation.mutate({ userId, data: { is_active: false } });
  };

  const handleActivate = (userId: string) => {
    updateUserMutation.mutate({ userId, data: { is_active: true } });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">User Management</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          Manage user accounts and permissions
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(241,240,255,0.38)]" />
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.20)] bg-[rgba(255,255,255,0.04)] text-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users?.length === 0 ? (
            <div className="text-center py-12 text-[rgba(241,240,255,0.38)]">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(167,139,250,0.10)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Datasets</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">API Keys</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Joined</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr key={u.id} className="border-b border-[rgba(167,139,250,0.05)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-text">{u.email}</p>
                          {u.full_name && <p className="text-xs text-[rgba(241,240,255,0.38)]">{u.full_name}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? <Crown className="h-3 w-3 mr-1" /> : null}
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">{u.dataset_count}</td>
                      <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">{u.api_key_count}</td>
                      <td className="py-3 px-4">
                        <Badge variant={u.is_active ? 'default' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-[rgba(241,240,255,0.65)]">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {u.role === 'admin' ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDemote(u.id)}>
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePromote(u.id)}>
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          {u.is_active ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleSuspend(u.id)}>
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400" onClick={() => handleActivate(u.id)}>
                              <Shield className="h-4 w-4" />
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
        </CardContent>
      </Card>
    </div>
  );
}