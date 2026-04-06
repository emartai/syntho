// Core data types for Syntho platform

export type Plan = 'free' | 'pro' | 'growth';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  plan: Plan;
  role: 'user' | 'admin';
  jobs_used_this_month: number;
  quota_reset_at: string;
  created_at: string;
}

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
  schema: Record<string, unknown>;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  created_at: string;
}

export interface SyntheticDataset {
  id: string;
  original_dataset_id: string;
  user_id: string;
  generation_method: 'ctgan' | 'gaussian_copula';
  file_path?: string;
  row_count?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  job_id?: string;
  progress: number;
  error_message?: string;
  config?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export interface TrustScore {
  id: string;
  synthetic_dataset_id: string;
  composite_score: number;
  privacy_weight: number;
  fidelity_weight: number;
  compliance_weight: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement';
  created_at: string;
}

export interface PrivacyScore {
  id: string;
  synthetic_dataset_id: string;
  overall_score: number;
  pii_detected: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  created_at: string;
}

export interface QualityReport {
  id: string;
  synthetic_dataset_id: string;
  correlation_score: number;
  distribution_score: number;
  overall_score: number;
  column_stats: Record<string, unknown>;
  passed: boolean;
  created_at: string;
}

export interface ComplianceReport {
  id: string;
  synthetic_dataset_id: string;
  report_type: 'gdpr' | 'hipaa' | 'combined';
  file_path?: string;
  passed: boolean;
  gdpr_passed?: boolean;
  hipaa_passed?: boolean;
  findings: Record<string, unknown>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: ('read' | 'generate')[];
  usage_count: number;
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
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

// Full result payload returned by the backend after job completion
export interface GenerationResult {
  synthetic_dataset_id: string;
  status: 'completed' | 'failed';
  trust_score: TrustScore;
  privacy_score: PrivacyScore;
  quality_report: QualityReport;
  compliance_report: ComplianceReport & { pdf_url?: string };
  row_count: number;
  generation_method: 'ctgan' | 'gaussian_copula';
  completed_at: string;
}
