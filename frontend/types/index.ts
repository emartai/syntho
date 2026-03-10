// Core data types for Syntho platform

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  file_path: string;
  file_size: number;
  file_type: string;
  row_count: number;
  column_count: number;
  schema: Record<string, any>;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  created_at: string;
}

export interface SyntheticDataset {
  id: string;
  original_dataset_id: string;
  user_id: string;
  generation_method: 'ctgan' | 'gaussian_copula' | 'tvae';
  file_path?: string;
  row_count?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  job_id?: string;
  progress: number;
  config?: Record<string, any>;
  created_at: string;
}

export interface PrivacyScore {
  id: string;
  synthetic_dataset_id: string;
  overall_score: number;
  pii_detected: Record<string, any>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  created_at: string;
}

export interface ComplianceReport {
  id: string;
  synthetic_dataset_id: string;
  report_type: 'gdpr' | 'hipaa' | 'combined';
  file_path?: string;
  passed: boolean;
  findings: Record<string, any>;
  created_at: string;
}

export interface QualityReport {
  id: string;
  synthetic_dataset_id: string;
  correlation_score: number;
  distribution_score: number;
  overall_score: number;
  column_stats: Record<string, any>;
  passed: boolean;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  synthetic_dataset_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  price: number;
  currency: string;
  is_active: boolean;
  download_count: number;
  preview_schema?: Record<string, any>;
  created_at: string;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  listing_id: string;
  amount: number;
  currency: string;
  flutterwave_tx_ref: string;
  flutterwave_tx_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  usage_count: number;
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  flutterwave_subaccount_id?: string;
  bank_account_verified: boolean;
  api_quota: number;
  created_at: string;
}

export interface JobStatus {
  job_id: string;
  synthetic_dataset_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}
