import { Plus, Search, FileText, Key, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: 'dataset' | 'search' | 'key' | 'purchase' | 'custom';
  customIcon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  className?: string;
}

const iconMap = {
  dataset: FileText,
  search: Search,
  key: Key,
  purchase: ShoppingCart,
  custom: null,
};

export function EmptyState({
  icon = 'custom',
  customIcon,
  title,
  description,
  actionLabel,
  onAction,
  href,
  className,
}: EmptyStateProps) {
  const Icon = iconMap[icon] || null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center rounded-[14px] border border-[rgba(167,139,250,0.10)]',
        className
      )}
      style={{
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'rgba(167,139,250,0.08)' }}
      >
        {customIcon || (Icon && <Icon className="w-8 h-8 text-[#a78bfa]" />)}
      </div>

      <h3
        className="text-lg font-semibold mb-2"
        style={{ fontFamily: 'Clash Display, sans-serif', color: '#f1f0ff' }}
      >
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[rgba(241,240,255,0.65)] max-w-sm mb-6">
          {description}
        </p>
      )}

      {(actionLabel && onAction) && (
        <Button onClick={onAction} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {actionLabel}
        </Button>
      )}

      {actionLabel && href && (
        <a href={href}>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {actionLabel}
          </Button>
        </a>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function EmptyDatasets({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon="dataset"
      title="No datasets yet"
      description="Upload your first dataset to start generating synthetic data"
      actionLabel="Upload Dataset"
      onAction={onUpload}
    />
  );
}

export function EmptyMarketplaceResults({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description="Try adjusting your filters or search terms"
      actionLabel="Clear Filters"
      onAction={onClearFilters}
    />
  );
}

export function EmptyApiKeys({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon="key"
      title="No API keys yet"
      description="Create an API key to integrate Syntho into your applications"
      actionLabel="Create API Key"
      onAction={onCreate}
    />
  );
}

export function EmptyPurchases() {
  return (
    <EmptyState
      icon="purchase"
      title="No purchases yet"
      description="Browse the marketplace to find synthetic datasets"
      actionLabel="Browse Marketplace"
      href="/marketplace"
    />
  );
}