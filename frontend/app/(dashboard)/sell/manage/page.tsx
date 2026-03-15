'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';

import { SellerDashboard } from '@/components/marketplace/SellerDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuroraBadge } from '@/components/shared/AuroraBadge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES = ['Health', 'Finance', 'Retail', 'E-commerce', 'Social', 'Other'];

export default function ManageListingsPage() {
  const queryClient = useQueryClient();
  const [editingListing, setEditingListing] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['seller-listings'],
    queryFn: async () => {
      const response = await api.marketplace.getSellerListings();
      return response.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return api.marketplace.toggleListing(listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-listings'] });
      toast.success('Listing status updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update listing', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      return api.marketplace.deleteListing(listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-listings'] });
      setShowDeleteConfirm(null);
      toast.success('Listing deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete listing', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return api.marketplace.updateListing(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-listings'] });
      setEditingListing(null);
      toast.success('Listing updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update listing', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-text">Manage Listings</h1>
          <p className="text-sm text-[rgba(241,240,255,0.65)]">
            View and manage your marketplace listings
          </p>
        </div>
        <Button onClick={() => window.location.href = '/sell'}>
          Create New Listing
        </Button>
      </div>

      {data && <SellerDashboard data={data} />}

      <Card>
        <CardHeader>
          <CardTitle>Your Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.listings?.length === 0 ? (
            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-8 text-center">
              <p className="text-[rgba(241,240,255,0.65)]">No listings yet</p>
              <Button
                variant="link"
                onClick={() => window.location.href = '/sell'}
                className="mt-2 text-primary"
              >
                Create your first listing
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(167,139,250,0.10)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Listing
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Downloads
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Revenue
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.listings?.map((listing: any) => (
                    <tr
                      key={listing.id}
                      className="border-b border-[rgba(167,139,250,0.10)] hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-text">{listing.title}</div>
                          <div className="text-xs text-[rgba(241,240,255,0.38)]">
                            {listing.generation_method === 'ctgan' ? 'CTGAN' : 'SDV'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {listing.category ? (
                          <AuroraBadge variant="primary">{listing.category}</AuroraBadge>
                        ) : (
                          <span className="text-[rgba(241,240,255,0.38)]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-primary">
                        ₦{listing.price.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-[rgba(241,240,255,0.65)]">
                        {listing.download_count}
                      </td>
                      <td className="py-3 px-4 text-green-400">
                        ₦{listing.revenue?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4">
                        <AuroraBadge variant={listing.is_active ? 'success' : 'primary'}>
                          {listing.is_active ? 'Active' : 'Inactive'}
                        </AuroraBadge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingListing(listing)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate(listing.id)}
                          >
                            {listing.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-400" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-[rgba(241,240,255,0.38)]" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(listing.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/marketplace/${listing.id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
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

      <Dialog open={!!editingListing} onOpenChange={() => setEditingListing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          {editingListing && (
            <EditListingForm
              listing={editingListing}
              onSave={(data: any) => updateMutation.mutate({ id: editingListing.id, data })}
              onCancel={() => setEditingListing(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
          </DialogHeader>
          <p className="text-[rgba(241,240,255,0.65)]">
            Are you sure you want to delete this listing? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && deleteMutation.mutate(showDeleteConfirm)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditListingForm({ listing, onSave, onCancel, isLoading }: any) {
  const [formData, setFormData] = useState({
    title: listing.title,
    description: listing.description || '',
    category: listing.category || '',
    price: listing.price,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFormData({ ...formData, category: cat })}
              className={`rounded-full px-3 py-1 text-xs transition-all ${
                formData.category === cat
                  ? 'bg-primary text-white'
                  : 'bg-[rgba(255,255,255,0.08)] text-[rgba(241,240,255,0.65)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-price">Price (₦)</Label>
        <Input
          id="edit-price"
          type="number"
          min={100}
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}