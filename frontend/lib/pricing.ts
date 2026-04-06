export const PLANS = {
  free: {
    name: 'Free',
    price_ngn: 0,
    display: '₦0/month',
    jobs_per_month: 10,
    max_rows: 10_000,
    methods: ['gaussian_copula'] as const,
    api_keys: false,
    priority_gpu: false,
  },
  pro: {
    name: 'Pro',
    price_ngn: 5_000,
    display: '₦5,000/month',
    jobs_per_month: null, // unlimited
    max_rows: 500_000,
    methods: ['gaussian_copula', 'ctgan'] as const,
    api_keys: true,
    priority_gpu: false,
  },
  growth: {
    name: 'Growth',
    price_ngn: 15_000,
    display: '₦15,000/month',
    jobs_per_month: null, // unlimited
    max_rows: 5_000_000,
    methods: ['gaussian_copula', 'ctgan'] as const,
    api_keys: true,
    priority_gpu: true,
  },
} as const;

export type Plan = keyof typeof PLANS;

export const FREE_JOBS_QUOTA = 10;
export const FREE_ROW_CAP = 10_000;
