-- ══════════════════════════════════════════════════════════════════════════════
-- 006_indexes.sql
-- Performance indexes for production scale
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_datasets_user_id
  ON datasets(user_id);

CREATE INDEX IF NOT EXISTS idx_synthetic_user_id
  ON synthetic_datasets(user_id);

CREATE INDEX IF NOT EXISTS idx_synthetic_original
  ON synthetic_datasets(original_dataset_id);

CREATE INDEX IF NOT EXISTS idx_synthetic_status
  ON synthetic_datasets(status);

CREATE INDEX IF NOT EXISTS idx_privacy_synthetic
  ON privacy_scores(synthetic_dataset_id);

CREATE INDEX IF NOT EXISTS idx_quality_synthetic
  ON quality_reports(synthetic_dataset_id);

CREATE INDEX IF NOT EXISTS idx_compliance_synthetic
  ON compliance_reports(synthetic_dataset_id);

CREATE INDEX IF NOT EXISTS idx_job_logs_synthetic
  ON job_logs(synthetic_dataset_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller
  ON marketplace_listings(seller_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active
  ON marketplace_listings(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id
  ON purchases(buyer_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_email
  ON waitlist(email);
