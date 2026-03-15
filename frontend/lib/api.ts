import axios, { AxiosError } from 'axios';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Router will be used for redirects - import dynamically to avoid SSR issues
    let router: any = null;
    if (typeof window !== 'undefined') {
      try {
        const nextNavigation = require('next/navigation');
        router = nextNavigation.useRouter();
      } catch (e) {
        // next/navigation not available
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out', {
        description: 'The server took too long to respond. Please try again.',
      });
      return Promise.reject(error);
    }

    if (!window.navigator.onLine) {
      toast.error('Connection error', {
        description: 'Please check your internet connection and try again.',
      });
      return Promise.reject(error);
    }

    const status = error.response?.status;

    switch (status) {
      case 401:
        // Clear auth state and redirect to login
        {
          const supabase = createClient();
          await supabase.auth.signOut();
          
          toast.error('Session expired', {
            description: 'Please sign in again to continue.',
          });
          
          // Redirect to login if not already there
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        break;

      case 403:
        toast.error('Access denied', {
          description: 'You don\'t have permission to perform this action.',
        });
        break;

      case 404:
        toast.error('Not found', {
          description: 'The requested resource was not found.',
        });
        break;

      case 429: {
        const retryAfter = error.response?.headers['retry-after'] || 
                          error.response?.headers['x-ratelimit-reset'] ||
                          '60';
        const seconds = parseInt(String(retryAfter), 10) || 60;
        
        toast.error('Rate limit exceeded', {
          description: `Please try again in ${seconds} seconds.`,
          duration: seconds * 1000,
        });
        break;
      }

      case 402: {
        const data = error.response?.data as any;
        toast.error('Monthly job limit reached', {
          description: data?.message || 'Upgrade to Pro for unlimited generation',
        });
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/settings/billing';
          }
        }, 1500);
        break;
      }

      case 500:
      case 502:
      case 503:
      case 504:
        toast.error('Server error', {
          description: 'Something went wrong on our end. Please try again later.',
        });
        break;

      default:
        if (status && status >= 400) {
          const message = (error.response?.data as any)?.detail || 
                         error.message || 
                         'An error occurred';
          toast.error('Error', { description: message });
        }
    }

    return Promise.reject(error);
  }
);

export { apiClient };

// Helper function to get auth headers
export async function getAuthHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
  };
}

// API endpoints
export const api = {
  // Datasets
  datasets: {
    list: () => apiClient.get('/api/v1/datasets'),
    get: (id: string) => apiClient.get(`/api/v1/datasets/${id}`),
    upload: (formData: FormData, onUploadProgress?: (progress: number) => void) =>
      apiClient.post('/api/v1/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onUploadProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onUploadProgress(progress);
          }
        },
      }),
    delete: (id: string) => apiClient.delete(`/api/v1/datasets/${id}`),
    download: (path: string) => apiClient.post('/api/v1/datasets/download', { path }),
  },
  
  // Synthetic datasets
  synthetic: {
    generate: (data: any) => apiClient.post('/api/v1/generate', data),
    cancel: (id: string) => apiClient.patch(`/api/v1/generate/${id}/cancel`),
    getStatus: (id: string) => apiClient.get(`/api/v1/generate/${id}/status`),
    get: (id: string) => apiClient.get(`/api/v1/synthetic/${id}`),
    list: () => apiClient.get('/api/v1/synthetic'),
  },
  
  // Marketplace
  marketplace: {
    list: (params?: any) => apiClient.get('/api/v1/marketplace', { params }),
    get: (id: string) => apiClient.get(`/api/v1/marketplace/${id}`),
    create: (data: any) => apiClient.post('/api/v1/marketplace/listings', data),
    getSellerListings: () => apiClient.get('/api/v1/marketplace/my-listings'),
    updateListing: (id: string, data: any) => apiClient.patch(`/api/v1/marketplace/listings/${id}`, data),
    deleteListing: (id: string) => apiClient.delete(`/api/v1/marketplace/listings/${id}`),
    toggleListing: (id: string) => apiClient.patch(`/api/v1/marketplace/listings/${id}/toggle`),
  },
  
  // API Keys
  apiKeys: {
    list: () => apiClient.get('/api/v1/api-keys'),
    create: (data: any) => apiClient.post('/api/v1/api-keys', data),
    delete: (id: string) => apiClient.delete(`/api/v1/api-keys/${id}`),
  },
  

  // Reports
  reports: {
    getCompliance: (syntheticDatasetId: string) =>
      apiClient.get(`/api/v1/reports/compliance/${syntheticDatasetId}`),
  },

  // Purchases
  purchases: {
    verify: (txRef: string) => apiClient.post('/api/v1/marketplace/purchases/verify', { tx_ref: txRef }),
    getMyPurchases: () => apiClient.get('/api/v1/marketplace/purchases/my-purchases'),
    getDownloadUrl: (listingId: string) => apiClient.get(`/api/v1/marketplace/purchases/download/${listingId}`),
  },

  // Seller
  seller: {
    getRevenue: () => apiClient.get('/api/v1/marketplace/seller/revenue'),
    getTransactions: () => apiClient.get('/api/v1/marketplace/seller/transactions'),
    getPayoutStatus: () => apiClient.get('/api/v1/marketplace/seller/payout-status'),
    getBanks: () => apiClient.get('/api/v1/marketplace/banks'),
    verifyAccount: (data: { account_number: string; bank_code: string }) =>
      apiClient.post('/api/v1/marketplace/verify-account', data),
    setupPayout: (data: { bank_code: string; account_number: string; business_name?: string }) =>
      apiClient.post('/api/v1/marketplace/seller/payout-setup', data),
  },

  // Webhooks
  webhooks: {
    flutterwave: (payload: any) => apiClient.post('/api/v1/webhooks/flutterwave', payload),
  },

  // AI
  ai: {
    recommendMethod: (datasetId: string) => apiClient.post(`/api/v1/ai/recommend-method/${datasetId}`),
    explainCompliance: (reportId: string) => apiClient.post(`/api/v1/ai/explain-compliance/${reportId}`),
    generateListingCopy: (syntheticDatasetId: string) => 
      apiClient.post('/api/v1/ai/listing-copy', { synthetic_dataset_id: syntheticDatasetId }),
    getQualityAdvice: (qualityReportId: string) => 
      apiClient.post(`/api/v1/ai/quality-advice/${qualityReportId}`),
    search: (query: string) => apiClient.get(`/api/v1/ai/search`, { params: { q: query } }),
  },
};