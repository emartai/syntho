-- ══════════════════════════════════════════════════════════════════════════════
-- 005_indexes.sql
-- Indexes on foreign keys + status + created_at
-- ══════════════════════════════════════════════════════════════════════════════

-- datasets
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets(created_at DESC);

-- synthetic_datasets
CREATE INDEX IF NOT EXISTS idx_synthetic_user_id ON synthetic_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_original ON synthetic_datasets(original_dataset_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_status ON synthetic_datasets(status);
CREATE INDEX IF NOT EXISTS idx_synthetic_created_at ON synthetic_datasets(created_at DESC);

-- privacy_scores
CREATE INDEX IF NOT EXISTS idx_privacy_synthetic ON privacy_scores(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_privacy_created_at ON privacy_scores(created_at DESC);

-- quality_reports
CREATE INDEX IF NOT EXISTS idx_quality_synthetic ON quality_reports(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_quality_created_at ON quality_reports(created_at DESC);

-- compliance_reports
CREATE INDEX IF NOT EXISTS idx_compliance_synthetic ON compliance_reports(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_created_at ON compliance_reports(created_at DESC);

-- trust_scores
CREATE INDEX IF NOT EXISTS idx_trust_scores_synthetic ON trust_scores(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_created_at ON trust_scores(created_at DESC);

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- job_logs
CREATE INDEX IF NOT EXISTS idx_job_logs_synthetic ON job_logs(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at DESC);
