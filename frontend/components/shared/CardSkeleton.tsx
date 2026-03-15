import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-[rgba(167,139,250,0.10)] p-5 animate-pulse',
        className
      )}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="h-5 w-3/4 bg-[rgba(167,139,250,0.1)] rounded" />
        <div className="h-6 w-20 bg-[rgba(167,139,250,0.1)] rounded-full" />
      </div>

      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-[rgba(167,139,250,0.08)] rounded" />
        <div className="h-3 w-5/6 bg-[rgba(167,139,250,0.08)] rounded" />
        <div className="h-3 w-4/6 bg-[rgba(167,139,250,0.08)] rounded" />
      </div>

      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-[rgba(167,139,250,0.1)] rounded" />
        <div className="h-8 w-28 bg-[rgba(167,139,250,0.1)] rounded" />
      </div>
    </div>
  );
}

interface StatCardSkeletonProps {
  className?: string;
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-[rgba(167,139,250,0.10)] p-5 animate-pulse',
        className
      )}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="h-4 w-24 bg-[rgba(167,139,250,0.1)] rounded mb-3" />
      <div className="h-8 w-32 bg-[rgba(167,139,250,0.15)] rounded" />
    </div>
  );
}

interface ListingCardSkeletonProps {
  className?: string;
}

export function ListingCardSkeleton({ className }: ListingCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-[rgba(167,139,250,0.10)] p-5 animate-pulse',
        className
      )}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-[rgba(167,139,250,0.1)]" />
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-[rgba(167,139,250,0.1)] rounded mb-2" />
          <div className="h-3 w-1/2 bg-[rgba(167,139,250,0.08)] rounded" />
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-[rgba(167,139,250,0.08)] rounded" />
        <div className="h-3 w-5/6 bg-[rgba(167,139,250,0.08)] rounded" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-[rgba(167,139,250,0.1)] rounded-full" />
          <div className="h-5 w-16 bg-[rgba(167,139,250,0.1)] rounded-full" />
        </div>
        <div className="h-6 w-20 bg-[rgba(167,139,250,0.1)] rounded" />
      </div>
    </div>
  );
}

interface GridSkeletonProps {
  count?: number;
  className?: string;
}

export function GridSkeleton({ count = 4, className }: GridSkeletonProps) {
  return (
    <div className={cn('grid gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

interface MarketplaceGridSkeletonProps {
  count?: number;
  className?: string;
}

export function MarketplaceGridSkeleton({ count = 6, className }: MarketplaceGridSkeletonProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}