'use client';

import { TrendingUp, DollarSign, Download, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SellerDashboardProps {
  data: {
    total_revenue: number;
    revenue_this_month: number;
    total_downloads: number;
    best_selling_listing: {
      title: string;
      revenue: number;
    } | null;
  };
}

export function SellerDashboard({ data }: SellerDashboardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
            Total Revenue
          </CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text">
            ₦{data.total_revenue.toLocaleString()}
          </div>
          <p className="text-xs text-[rgba(241,240,255,0.38)]">
            All time earnings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
            This Month
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text">
            ₦{data.revenue_this_month.toLocaleString()}
          </div>
          <p className="text-xs text-[rgba(241,240,255,0.38)]">
            Revenue this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
            Total Downloads
          </CardTitle>
          <Download className="h-4 w-4 text-cyan-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text">
            {data.total_downloads.toLocaleString()}
          </div>
          <p className="text-xs text-[rgba(241,240,255,0.38)]">
            Times purchased
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-[rgba(241,240,255,0.65)]">
            Best Seller
          </CardTitle>
          <Trophy className="h-4 w-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text truncate">
            {data.best_selling_listing?.title || 'N/A'}
          </div>
          <p className="text-xs text-[rgba(241,240,255,0.38)]">
            {data.best_selling_listing
              ? `₦${data.best_selling_listing.revenue.toLocaleString()} earned`
              : 'No sales yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}