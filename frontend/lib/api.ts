import axios, { AxiosInstance } from 'axios'
import { createBrowserClient } from '@supabase/ssr'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!BASE_URL && typeof window !== 'undefined') {
  console.error('[Syntho] NEXT_PUBLIC_API_URL is not set')
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
})

http.interceptors.request.use(async (config) => {
  const token = await getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['datasets', 'synthetic_datasets', 'results', 'data', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as T[]
    }
  }
  return []
}

export async function uploadDataset(
  file: File,
  onProgress?: (pct: number) => void,
  meta?: { name?: string; description?: string }
): Promise<any> {
  const form = new FormData()
  form.append('file', file)
  if (meta?.name) form.append('name', meta.name)
  if (meta?.description) form.append('description', meta.description)

  const { data } = await http.post('/api/v1/datasets', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
  return data
}

export async function listDatasets(): Promise<any[]> {
  const { data } = await http.get('/api/v1/datasets')
  return toArray(data)
}

export async function getDataset(id: string): Promise<any> {
  const { data } = await http.get(`/api/v1/datasets/${id}`)
  return data
}

export async function deleteDataset(id: string): Promise<void> {
  await http.delete(`/api/v1/datasets/${id}`)
}

export async function downloadOriginalDataset(id: string): Promise<string> {
  const { data } = await http.get(`/api/v1/datasets/${id}/download`)
  return data?.download_url ?? data?.url ?? data
}

export async function startGeneration(payload: {
  dataset_id: string
  method: 'ctgan' | 'gaussian_copula'
  num_rows?: number
}): Promise<any> {
  const { data } = await http.post('/api/v1/generate', payload)
  return data
}

export async function getGenerationStatus(id: string): Promise<any> {
  const { data } = await http.get(`/api/v1/generate/${id}/status`)
  return data
}

export async function cancelGeneration(id: string): Promise<void> {
  await http.patch(`/api/v1/generate/${id}/cancel`)
}

export async function listSyntheticDatasets(datasetId?: string): Promise<any[]> {
  const url = datasetId
    ? `/api/v1/synthetic?dataset_id=${datasetId}`
    : '/api/v1/synthetic'
  const { data } = await http.get(url)
  return toArray(data)
}

export async function downloadSynthetic(id: string): Promise<string> {
  const { data } = await http.get(`/api/v1/synthetic/${id}/download`)
  return data?.download_url ?? data?.url ?? data
}

export async function getPrivacyScore(syntheticId: string): Promise<any> {
  const { data } = await http.get(`/api/v1/reports/privacy/${syntheticId}`)
  return data
}

export async function getQualityReport(syntheticId: string): Promise<any> {
  const { data } = await http.get(`/api/v1/reports/quality/${syntheticId}`)
  return data
}

export async function getComplianceReport(syntheticId: string): Promise<any> {
  const { data } = await http.get(`/api/v1/reports/compliance/${syntheticId}`)
  return data
}

export async function downloadCompliancePDF(syntheticId: string): Promise<void> {
  const response = await http.get(
    `/api/v1/reports/compliance/${syntheticId}/pdf`,
    { responseType: 'blob' }
  )
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `syntho-compliance-${syntheticId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const api = {
  datasets: {
    list: () => http.get('/api/v1/datasets'),
    get: (id: string) => http.get(`/api/v1/datasets/${id}`),
    upload: (formData: FormData, onUploadProgress?: (progress: number) => void) =>
      http.post('/api/v1/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onUploadProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onUploadProgress(progress)
          }
        },
      }),
    delete: (id: string) => http.delete(`/api/v1/datasets/${id}`),
  },
  synthetic: {
    generate: (data: any) => http.post('/api/v1/generate', data),
    cancel: (id: string) => http.patch(`/api/v1/generate/${id}/cancel`),
    getStatus: (id: string) => http.get(`/api/v1/generate/${id}/status`),
    get: (id: string) => http.get(`/api/v1/synthetic/${id}`),
    list: () => http.get('/api/v1/synthetic'),
  },
  reports: {
    getCompliance: (syntheticDatasetId: string) =>
      http.get(`/api/v1/reports/compliance/${syntheticDatasetId}`),
  },
  apiKeys: {
    list: () => http.get('/api/v1/api-keys'),
    create: (data: { name: string; scopes: string[] }) => http.post('/api/v1/api-keys', data),
    revoke: (id: string) => http.delete(`/api/v1/api-keys/${id}`),
  },
  billing: {
    status: () => http.get('/api/v1/billing/status'),
    upgrade: (data: { plan: 'pro' | 'growth'; tx_ref: string; transaction_id?: string | number }) =>
      http.post('/api/v1/billing/upgrade', data),
  },
  notifications: {
    list: () => http.get('/api/v1/notifications'),
    markRead: (id: string) => http.patch(`/api/v1/notifications/${id}/read`),
    markAllRead: () => http.patch('/api/v1/notifications/read-all'),
  },
}

export { http as apiClient }
