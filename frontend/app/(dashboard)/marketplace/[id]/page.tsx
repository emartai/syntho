'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, BarChart3, Shield, FileText, Download } from 'lucide-react';
import { notFound } from 'next/navigation';

import { FLAGS } from '@/lib/flags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuroraBadge } from '@/components/shared/AuroraBadge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const RISK_COLORS = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
} as const;

const METHOD_LABELS: Record<string, string> = {
  ctgan: 'CTGAN (GAN-based)',
  gaussian_copula: 'SDV (Statistical)',
  tvae: 'TVAE (Transformer)',
};

export default function MarketplaceListingPage() {
  if (!FLAGS.MARKETPLACE) notFound();

  const params = useParams<{ id: string }>();
  const listingId = params.id;

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['marketplace-listing', listingId],
    queryFn: async () => {
      const response = await api.marketplace.get(listingId);
      return response.data;
    },
    enabled: !!listingId,
  });

  const handlePurchase = async () => {
    toast.info('Purchase flow coming soon', {
      description: 'Flutterwave integration will be added in a future update.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-red-400">
          Failed to load listing
        </CardContent>
      </Card>
    );
  }

  const columns = listing.preview_schema?.columns || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-2 text-sm text-[rgba(241,240,255,0.65)] hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {listing.category && (
                <AuroraBadge variant="primary">{listing.category}</AuroraBadge>
              )}
              {listing.generation_method && (
                <AuroraBadge variant="accent">
                  {METHOD_LABELS[listing.generation_method] || listing.generation_method}
                </AuroraBadge>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-text">{listing.title}</h1>
            {listing.description && (
              <p className="text-[rgba(241,240,255,0.65)]">{listing.description}</p>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Schema Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg bg-[rgba(6,182,212,0.10)] p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{listing.row_count?.toLocaleString()}</div>
                  <div className="text-xs text-[rgba(241,240,255,0.38)]">Rows</div>
                </div>
                <div className="rounded-lg bg-[rgba(167,139,250,0.10)] p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{listing.column_count}</div>
                  <div className="text-xs text-[rgba(241,240,255,0.38)]">Columns</div>
                </div>
                <div className="rounded-lg bg-[rgba(34,197,94,0.10)] p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{listing.privacy_score}%</div>
                  <div className="text-xs text-[rgba(241,240,255,0.38)]">Privacy Score</div>
                </div>
              </div>

              <div className="rounded-lg border border-[rgba(167,139,250,0.10)] overflow-hidden">
                <div className="grid grid-cols-3 bg-[rgba(167,139,250,0.10)] px-4 py-2 text-xs font-medium text-[rgba(241,240,255,0.65)]">
                  <span>Column Name</span>
                  <span>Type</span>
                  <span>Sample Values</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {columns.map((col: any, i: number) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 border-t border-[rgba(167,139,250,0.10)] px-4 py-2 text-sm"
                    >
                      <span className="text-text truncate">{col.name}</span>
                      <span className="text-[rgba(241,240,255,0.38)]">{col.data_type}</span>
                      <span className="text-[rgba(241,240,255,0.38)] truncate">
                        {col.sample_values ? col.sample_values.slice(0, 3).join(', ') : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[rgba(241,240,255,0.65)]">Correlation Score</span>
                    <span className="text-primary font-medium">{listing.correlation_score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${listing.correlation_score}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[rgba(241,240,255,0.65)]">Distribution Score</span>
                    <span className="text-primary font-medium">{listing.distribution_score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${listing.distribution_score}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[rgba(241,240,255,0.65)]">Overall Quality</span>
                    <span className="text-primary font-medium">{listing.quality_score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${listing.quality_score}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {listing.compliance_reports?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Compliance Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {listing.compliance_reports.map((report: any) => (
                    <div
                      key={report.id}
                      className={`flex items-center justify-between rounded-lg p-3 ${
                        report.passed
                          ? 'bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.25)]'
                          : 'bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.25)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${report.passed ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-sm font-medium text-text">
                          {report.report_type.toUpperCase()}
                        </span>
                      </div>
                      <AuroraBadge variant={report.passed ? 'success' : 'danger'}>
                        {report.passed ? 'PASSED' : 'FAILED'}
                      </AuroraBadge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <div className="text-sm text-[rgba(241,240,255,0.38)]">Price</div>
                <div className="font-display text-4xl font-bold text-primary">
                  ₦{listing.price?.toLocaleString()}
                </div>
              </div>

              <Button
                onClick={handlePurchase}
                className="w-full bg-gradient-to-r from-primary to-accent text-white"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Purchase Now
              </Button>

              <div className="flex items-center justify-center gap-4 text-xs text-[rgba(241,240,255,0.38)]">
                <span className="flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  {listing.download_count} sold
                </span>
                {listing.privacy_risk_level && (
                  <AuroraBadge variant={RISK_COLORS[listing.privacy_risk_level as keyof typeof RISK_COLORS] || 'primary'}>
                    {listing.privacy_risk_level} risk
                  </AuroraBadge>
                )}
              </div>

              <div className="border-t border-[rgba(167,139,250,0.10)] pt-4">
                <h3 className="mb-3 text-sm font-medium text-[rgba(241,240,255,0.65)]">Seller</h3>
                <div className="flex items-center gap-3">
                  {listing.seller_avatar ? (
                    <img src={listing.seller_avatar} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-[rgba(167,139,250,0.25)]" />
                  )}
                  <div>
                    <div className="font-medium text-text">
                      {listing.seller_name || 'Anonymous Seller'}
                    </div>
                    <div className="text-xs text-[rgba(241,240,255,0.38)]">
                      Member since {new Date(listing.created_at).getFullYear()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-[rgba(6,182,212,0.10)] p-3 text-xs text-cyan-400">
                <p>After purchase, you&apos;ll receive:</p>
                <ul className="mt-2 space-y-1 text-[rgba(241,240,255,0.65)]">
                  <li>• Download link for synthetic data</li>
                  <li>• Privacy score report</li>
                  <li>• Quality comparison report</li>
                  <li>• Compliance certificates</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}