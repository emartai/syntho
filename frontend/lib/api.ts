import axios from 'axios';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could redirect to login
      console.error('Unauthorized request');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

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
  },
  
  // Synthetic datasets
  synthetic: {
    generate: (data: any) => apiClient.post('/api/v1/generate', data),
    cancel: (id: string) => apiClient.patch(`/api/v1/generate/${id}/cancel`),
    get: (id: string) => apiClient.get(`/api/v1/synthetic/${id}`),
    list: () => apiClient.get('/api/v1/synthetic'),
  },
  
  // Marketplace
  marketplace: {
    list: (params?: any) => apiClient.get('/api/v1/marketplace', { params }),
    get: (id: string) => apiClient.get(`/api/v1/marketplace/${id}`),
    create: (data: any) => apiClient.post('/api/v1/marketplace', data),
  },
  
  // API Keys
  apiKeys: {
    list: () => apiClient.get('/api/v1/api-keys'),
    create: (data: any) => apiClient.post('/api/v1/api-keys', data),
    delete: (id: string) => apiClient.delete(`/api/v1/api-keys/${id}`),
  },
  
  // Purchases
  purchases: {
    verify: (txRef: string) => apiClient.post('/api/v1/purchases/verify', { tx_ref: txRef }),
  },
};
