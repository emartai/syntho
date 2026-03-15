'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Check, ChevronRight, Eye, DollarSign, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuroraBadge } from '@/components/shared/AuroraBadge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES = ['Health', 'Finance', 'Retail', 'E-commerce', 'Social', 'Other'];

const createListingSchema = z.object({
  synthetic_dataset_id: z.string().min(1, 'Please select a dataset'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags').optional(),
  price: z.number().min(100, 'Price must be at least ₦100'),
});

type CreateListingForm = z.infer<typeof createListingSchema>;

const STEPS = [
  { key: 'select', label: 'Select Dataset' },
  { key: 'details', label: 'Listing Details' },
  { key: 'preview', label: 'Preview' },
];

export default function SellPage() {
  const [step, setStep] = useState(0);
  const [selectedDataset, setSelectedDataset] = useState<any>(null);

  const { data: syntheticDatasets, isLoading: loadingDatasets } = useQuery({
    queryKey: ['synthetic-datasets-for-sale'],
    queryFn: async () => {
      const response = await api.synthetic.list();
      const completed = response.data.filter((d: any) => d.status === 'completed');
      return completed;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateListingForm) => {
      const payload = {
        synthetic_dataset_id: data.synthetic_dataset_id,
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        category: data.category,
        price: data.price,
      };
      return api.marketplace.create(payload);
    },
    onSuccess: () => {
      toast.success('Listing created successfully!');
      window.location.href = '/sell/manage';
    },
    onError: (error: any) => {
      toast.error('Failed to create listing', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateListingForm>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      price: 500,
    },
  });

  const formData = watch();

  const canProceed = () => {
    if (step === 0) return selectedDataset;
    if (step === 1) return formData.title && formData.price >= 100;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const onSubmit = (data: CreateListingForm) => {
    createMutation.mutate(data);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
    setValue('tags', tags);
  };

  // Fetch AI-generated listing copy when dataset is selected
  const [aiCopy, setAiCopy] = useState<{title: string; description: string; tags: string[]} | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (selectedDataset && step === 1 && !aiCopy) {
      setAiLoading(true);
      api.ai.generateListingCopy(selectedDataset.id)
        .then(res => {
          setAiCopy(res.data);
          if (res.data.title) setValue('title', res.data.title);
          if (res.data.description) setValue('description', res.data.description);
          if (res.data.tags) setValue('tags', res.data.tags);
        })
        .catch(() => {/* Silently fail - AI is optional */})
        .finally(() => setAiLoading(false));
    }
  }, [selectedDataset, step]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">List Dataset for Sale</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          Create a marketplace listing for your synthetic dataset
        </p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                i <= step
                  ? 'bg-primary text-white'
                  : 'bg-[rgba(255,255,255,0.08)] text-[rgba(241,240,255,0.38)]'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i <= step ? 'text-text' : 'text-[rgba(241,240,255,0.38)]'}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-[rgba(241,240,255,0.2)]" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-text">
                Select a Synthetic Dataset
              </h2>
              <p className="text-sm text-[rgba(241,240,255,0.65)]">
                Choose which completed synthetic dataset you want to sell
              </p>

              {loadingDatasets ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : syntheticDatasets?.length === 0 ? (
                <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-8 text-center">
                  <p className="text-[rgba(241,240,255,0.65)]">
                    No completed synthetic datasets available
                  </p>
                  <Button
                    variant="link"
                    onClick={() => window.location.href = '/datasets'}
                    className="mt-2 text-primary"
                  >
                    View your datasets
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {syntheticDatasets?.map((dataset: any) => (
                    <button
                      key={dataset.id}
                      onClick={() => setSelectedDataset(dataset)}
                      className={`w-full rounded-lg border p-4 text-left transition-all ${
                        selectedDataset?.id === dataset.id
                          ? 'border-primary bg-[rgba(167,139,250,0.10)]'
                          : 'border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] hover:border-[rgba(167,139,250,0.22)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-text">
                            {dataset.generation_method === 'ctgan' ? 'CTGAN' : 'SDV'} Dataset
                          </div>
                          <div className="text-sm text-[rgba(241,240,255,0.38)]">
                            {dataset.row_count?.toLocaleString()} rows · {dataset.column_count} columns
                          </div>
                        </div>
                        {selectedDataset?.id === dataset.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <form className="space-y-6">
              <h2 className="font-display text-lg font-semibold text-text">
                Listing Details
              </h2>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="title">Title *</Label>
                  {aiCopy?.title && (
                    <AuroraBadge variant="accent" className="text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-generated
                    </AuroraBadge>
                  )}
                </div>
                <Input
                  id="title"
                  placeholder="e.g., Customer Transactions 2024"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-xs text-red-400">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="description">Description (max 500 chars)</Label>
                  {aiCopy?.description && (
                    <AuroraBadge variant="accent" className="text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-generated
                    </AuroraBadge>
                  )}
                </div>
                <Textarea
                  id="description"
                  placeholder="Describe your dataset..."
                  maxLength={500}
                  rows={4}
                  {...register('description')}
                />
                <p className="text-xs text-[rgba(241,240,255,0.38)] text-right">
                  {watch('description')?.length || 0}/500
                </p>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setValue('category', cat)}
                      className={`rounded-full px-4 py-2 text-sm transition-all ${
                        watch('category') === cat
                          ? 'bg-primary text-white'
                          : 'bg-[rgba(255,255,255,0.08)] text-[rgba(241,240,255,0.65)] hover:bg-[rgba(255,255,255,0.12)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated, max 5)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., retail, transactions, 2024"
                  onChange={handleTagsChange}
                  defaultValue={watch('tags')?.join(', ')}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {watch('tags')?.map((tag: string) => (
                    <AuroraBadge key={tag} variant="primary">
                      {tag}
                    </AuroraBadge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₦) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(241,240,255,0.38)]" />
                  <Input
                    id="price"
                    type="number"
                    min={100}
                    step={50}
                    className="pl-10"
                    {...register('price', { valueAsNumber: true })}
                  />
                </div>
                <p className="text-xs text-[rgba(241,240,255,0.38)]">
                  Minimum price: ₦100
                </p>
                {errors.price && (
                  <p className="text-xs text-red-400">{errors.price.message}</p>
                )}
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-semibold text-text">
                Preview Your Listing
              </h2>

              <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-lg font-semibold text-text">
                      {formData.title}
                    </h3>
                    {formData.category && (
                      <AuroraBadge variant="primary">{formData.category}</AuroraBadge>
                    )}
                  </div>

                  {formData.description && (
                    <p className="text-sm text-[rgba(241,240,255,0.65)]">
                      {formData.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {formData.tags?.map((tag: string) => (
                      <AuroraBadge key={tag} variant="accent">
                        {tag}
                      </AuroraBadge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[rgba(241,240,255,0.38)]">
                    <span>{selectedDataset?.row_count?.toLocaleString()} rows</span>
                    <span>{selectedDataset?.column_count} columns</span>
                  </div>

                  <div className="pt-2 border-t border-[rgba(167,139,250,0.10)]">
                    <span className="font-display text-2xl font-bold text-primary">
                      ₦{formData.price?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={createMutation.isPending}
            className="bg-gradient-to-r from-primary to-accent"
          >
            Create Listing
          </Button>
        )}
      </div>
    </div>
  );
}