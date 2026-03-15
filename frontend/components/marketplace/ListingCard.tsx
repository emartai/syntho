'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, ShoppingCart, BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuroraBadge } from '@/components/shared/AuroraBadge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    price: number;
    download_count: number;
    generation_method?: string;
    privacy_score?: number;
    privacy_risk_level?: string;
    row_count?: number;
    column_count?: number;
    preview_schema?: Record<string, any>;
    seller_name?: string;
    seller_avatar?: string;
  };
  onPurchase?: (listingId: string) => void;
}

const CATEGORIES = ['Health', 'Finance', 'Retail', 'E-commerce', 'Social', 'Other'];

const RISK_COLORS = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
} as const;

const METHOD_LABELS: Record<string, string> = {
  ctgan: 'CTGAN',
  gaussian_copula: 'SDV',
  tvae: 'TVAE',
};

export function ListingCard({ listing, onPurchase }: ListingCardProps) {
  const [showSchema, setShowSchema] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const columns = listing.preview_schema?.columns || [];
  const numericCount = columns.filter((c: any) => 
    ['integer', 'float', 'numeric', 'decimal'].includes(c.data_type?.toLowerCase())
  ).length;
  const categoricalCount = columns.length - numericCount;

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await onPurchase?.(listing.id);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <>
      <div className="group relative rounded-[14px] border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-5 transition-all hover:border-[rgba(167,139,250,0.22)] hover:bg-[rgba(255,255,255,0.07)]">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-text line-clamp-1">
              {listing.title}
            </h3>
            {listing.category && (
              <AuroraBadge variant="primary">{listing.category}</AuroraBadge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {listing.generation_method && (
              <AuroraBadge variant="accent">{METHOD_LABELS[listing.generation_method] || listing.generation_method}</AuroraBadge>
            )}
            {listing.privacy_score !== undefined && (
              <AuroraBadge variant={RISK_COLORS[(listing.privacy_risk_level || 'low') as keyof typeof RISK_COLORS]}>
                Privacy: {listing.privacy_score}%
              </AuroraBadge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-[rgba(241,240,255,0.38)]">
            <span>{listing.row_count?.toLocaleString()} rows</span>
            <span>{listing.column_count} columns</span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {numericCount} numeric
            </span>
            <span className="flex items-center gap-1">
              {categoricalCount} categorical
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-display text-xl font-bold text-primary">
              ₦{listing.price.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-xs text-[rgba(241,240,255,0.38)]">
              <ShoppingCart className="h-3 w-3" />
              {listing.download_count}
            </span>
          </div>

          {listing.seller_name && (
            <div className="flex items-center gap-2 text-xs text-[rgba(241,240,255,0.65)]">
              {listing.seller_avatar ? (
                <img src={listing.seller_avatar} alt="" className="h-5 w-5 rounded-full" />
              ) : (
                <div className="h-5 w-5 rounded-full bg-[rgba(167,139,250,0.25)]" />
              )}
              <span>{listing.seller_name}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSchema(true)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="flex-1 bg-gradient-to-r from-primary to-accent"
            >
              {isPurchasing ? 'Loading...' : 'Purchase'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showSchema} onOpenChange={setShowSchema}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schema Preview: {listing.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-[rgba(6,182,212,0.10)] p-3 text-center">
                <div className="text-lg font-bold text-cyan-400">{listing.row_count?.toLocaleString()}</div>
                <div className="text-xs text-[rgba(241,240,255,0.38)]">Rows</div>
              </div>
              <div className="rounded-lg bg-[rgba(167,139,250,0.10)] p-3 text-center">
                <div className="text-lg font-bold text-primary">{listing.column_count}</div>
                <div className="text-xs text-[rgba(241,240,255,0.38)]">Columns</div>
              </div>
              <div className="rounded-lg bg-[rgba(34,197,94,0.10)] p-3 text-center">
                <div className="text-lg font-bold text-green-400">{listing.privacy_score}%</div>
                <div className="text-xs text-[rgba(241,240,255,0.38)]">Privacy</div>
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] overflow-hidden">
              <div className="grid grid-cols-2 bg-[rgba(167,139,250,0.10)] px-4 py-2 text-xs font-medium text-[rgba(241,240,255,0.65)]">
                <span>Column Name</span>
                <span>Type</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {columns.map((col: any, i: number) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 border-t border-[rgba(167,139,250,0.10)] px-4 py-2 text-sm"
                  >
                    <span className="text-text truncate">{col.name}</span>
                    <span className="text-[rgba(241,240,255,0.38)]">{col.data_type}</span>
                  </div>
                ))}
                {columns.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-[rgba(241,240,255,0.38)]">
                    No schema information available
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowSchema(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}