'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { notFound } from 'next/navigation';

import { FLAGS } from '@/lib/flags';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES = ['Health', 'Finance', 'Retail', 'E-commerce', 'Social', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_downloaded', label: 'Most Downloaded' },
  { value: 'lowest_price', label: 'Lowest Price' },
  { value: 'highest_privacy', label: 'Highest Privacy Score' },
];

export default function MarketplacePage() {
  if (!FLAGS.MARKETPLACE) notFound();

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const [category, setCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(500000);
  const [generationMethod, setGenerationMethod] = useState<string | null>(null);
  const [lowRiskOnly, setLowRiskOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [aiSearchResults, setAiSearchResults] = useState<string[] | null>(null);
  const perPage = 12;

  const params = {
    search: debouncedSearch || undefined,
    category: category || undefined,
    min_price: minPrice > 0 ? minPrice : undefined,
    max_price: maxPrice < 500000 ? maxPrice : undefined,
    generation_method: generationMethod || undefined,
    low_risk_only: lowRiskOnly || undefined,
    sort_by: sortBy,
    page,
    per_page: perPage,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['marketplace', params],
    queryFn: async () => {
      const response = await api.marketplace.list(params);
      return response.data;
    },
  });

  // AI search query
  const { data: aiSearchData } = useQuery({
    queryKey: ['ai-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch?.trim()) return null;
      const response = await api.ai.search(debouncedSearch);
      return response.data;
    },
    enabled: !!debouncedSearch?.trim(),
  });

  // Update AI search results when data changes
  useEffect(() => {
    if (aiSearchData?.results) {
      setAiSearchResults(aiSearchData.results);
    } else {
      setAiSearchResults(null);
    }
  }, [aiSearchData]);

  const handlePurchase = useCallback(async (listingId: string) => {
    toast.info('Purchase flow coming soon', {
      description: 'Flutterwave integration will be added in a future update.',
    });
  }, []);

  const clearFilters = () => {
    setSearch('');
    setCategory(null);
    setMinPrice(0);
    setMaxPrice(500000);
    setGenerationMethod(null);
    setLowRiskOnly(false);
    setSortBy('newest');
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || category || minPrice > 0 || maxPrice < 500000 || generationMethod || lowRiskOnly;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">Syntho Marketplace</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          Discover and purchase high-quality synthetic datasets
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full lg:w-64 space-y-6">
          <div className="rounded-[14px] border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-text">Filters</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[rgba(241,240,255,0.65)]">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(category === cat ? null : cat)}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${
                      category === cat
                        ? 'bg-primary text-white'
                        : 'bg-[rgba(255,255,255,0.07)] text-[rgba(241,240,255,0.65)] hover:bg-[rgba(255,255,255,0.11)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[rgba(241,240,255,0.65)]">Price Range (₦)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice === 500000 ? '' : maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value) || 500000)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[rgba(241,240,255,0.65)]">Generation Method</label>
              <div className="flex flex-wrap gap-2">
                {['CTGAN', 'SDV'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setGenerationMethod(generationMethod === method ? null : method)}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${
                      generationMethod === method
                        ? 'bg-accent text-white'
                        : 'bg-[rgba(255,255,255,0.07)] text-[rgba(241,240,255,0.65)] hover:bg-[rgba(255,255,255,0.11)]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowRiskOnly}
                onChange={(e) => setLowRiskOnly(e.target.checked)}
                className="rounded border-[rgba(167,139,250,0.25)] bg-[rgba(255,255,255,0.07)]"
              />
              <span className="text-xs text-[rgba(241,240,255,0.65)]">Low Risk Only</span>
            </label>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(241,240,255,0.38)]" />
              <Input
                placeholder="Search datasets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {aiSearchResults && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-accent">
                  <Sparkles className="h-3 w-3" />
                  AI Search
                </div>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] px-3 text-sm text-text focus:border-primary focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-[14px] border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-5"
                >
                  <div className="h-5 w-3/4 rounded bg-[rgba(167,139,250,0.15)]" />
                  <div className="mt-3 h-4 w-1/2 rounded bg-[rgba(167,139,250,0.10)]" />
                  <div className="mt-4 h-8 w-full rounded bg-[rgba(167,139,250,0.10)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] p-4 text-center text-red-400">
              Failed to load marketplace listings
            </div>
          ) : data?.listings?.length === 0 ? (
            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-8 text-center">
              <p className="text-[rgba(241,240,255,0.65)]">No listings found</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Array.isArray(aiSearchResults) ? (data?.listings ?? []).filter((l: any) => aiSearchResults.includes(l.id)) : (data?.listings ?? [])).map((listing: any) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onPurchase={handlePurchase}
                  />
                ))}
              </div>

              {data && data.total > perPage && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[rgba(241,240,255,0.38)]">
                    Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, data.total)} of {data.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-[rgba(241,240,255,0.65)]">
                      Page {page} of {data.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                      disabled={page >= data.total_pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}