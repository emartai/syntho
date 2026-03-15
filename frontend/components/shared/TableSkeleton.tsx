import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  className?: string;
}

export function TableSkeleton({ columns, rows = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b border-[rgba(167,139,250,0.10)] pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-[rgba(167,139,250,0.1)] rounded animate-pulse"
            style={{ flex: i === columns - 1 ? 1 : '0 0 100px' }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 bg-[rgba(167,139,250,0.05)] rounded animate-pulse"
              style={{ flex: colIndex === columns - 1 ? 1 : '0 0 100px' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface DatasetTableSkeletonProps {
  className?: string;
}

export function DatasetTableSkeleton({ className }: DatasetTableSkeletonProps) {
  return (
    <div className={cn('rounded-[14px] border border-[rgba(167,139,250,0.10)] p-4', className)}>
      <TableSkeleton columns={5} rows={5} />
    </div>
  );
}

interface ApiKeysTableSkeletonProps {
  className?: string;
}

export function ApiKeysTableSkeleton({ className }: ApiKeysTableSkeletonProps) {
  return (
    <div className={cn('rounded-[14px] border border-[rgba(167,139,250,0.10)] p-4', className)}>
      <TableSkeleton columns={4} rows={4} />
    </div>
  );
}

interface MarketplaceTableSkeletonProps {
  className?: string;
}

export function MarketplaceTableSkeleton({ className }: MarketplaceTableSkeletonProps) {
  return (
    <div className={cn('rounded-[14px] border border-[rgba(167,139,250,0.10)] p-4', className)}>
      <TableSkeleton columns={5} rows={6} />
    </div>
  );
}