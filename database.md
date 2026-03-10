# Syntho — Database Reference
## Complete SQL, RLS Policies, Triggers, and Storage Policies

---

## Full Schema SQL
### Run this in Supabase SQL Editor — migrations/001_initial_schema.sql

```sql
-- ============================================================
-- SYNTHO DATABASE SCHEMA
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  api_quota INTEGER DEFAULT 100,
  flutterwave_subaccount_id TEXT,
  bank_account_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- DATASETS (original uploads)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT CHECK (file_type IN ('csv', 'json', 'parquet', 'xlsx')),
  row_count INTEGER,
  column_count INTEGER,
  schema JSONB DEFAULT '[]',
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- SYNTHETIC DATASETS (generated outputs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE synthetic_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  generation_method TEXT CHECK (generation_method IN ('ctgan', 'gaussian_copula', 'tvae')),
  file_path TEXT,
  row_count INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  job_id TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  config JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PRIVACY SCORES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE privacy_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE NOT NULL,
  overall_score NUMERIC(5,2) CHECK (overall_score BETWEEN 0 AND 100),
  pii_detected JSONB DEFAULT '[]',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  singling_out_risk NUMERIC(5,2),
  linkability_risk NUMERIC(5,2),
  inference_risk NUMERIC(5,2),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- COMPLIANCE REPORTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT CHECK (report_type IN ('gdpr', 'hipaa', 'combined')),
  file_path TEXT,
  passed BOOLEAN,
  gdpr_passed BOOLEAN,
  hipaa_passed BOOLEAN,
  findings JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- QUALITY REPORTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE NOT NULL,
  correlation_score NUMERIC(5,2),
  distribution_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  column_stats JSONB DEFAULT '[]',
  passed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- MARKETPLACE LISTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT CHECK (category IN (
    'healthcare', 'finance', 'ecommerce', 'iot', 'hr', 
    'education', 'government', 'research', 'other'
  )),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  currency TEXT DEFAULT 'NGN',
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  preview_schema JSONB DEFAULT '[]',
  preview_stats JSONB DEFAULT '{}',
  privacy_score_snapshot NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PURCHASES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2),
  seller_amount NUMERIC(10,2),
  currency TEXT NOT NULL,
  flutterwave_tx_ref TEXT UNIQUE,
  flutterwave_tx_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- API KEYS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['generate', 'read'],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN (
    'generation_complete', 'generation_failed', 'purchase_received',
    'dataset_purchased', 'privacy_alert', 'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- JOB LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER datasets_updated_at BEFORE UPDATE ON datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER synthetic_datasets_updated_at BEFORE UPDATE ON synthetic_datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER marketplace_listings_updated_at BEFORE UPDATE ON marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## RLS Policies
### Run in Supabase SQL Editor — migrations/002_rls_policies.sql

```sql
-- ─────────────────────────────────────────────────────────────
-- ENABLE RLS ON ALL TABLES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_datasets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs             ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────
-- DATASETS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own datasets"
  ON datasets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON datasets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
  ON datasets FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- SYNTHETIC DATASETS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own synthetic datasets"
  ON synthetic_datasets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synthetic datasets"
  ON synthetic_datasets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: Updates done by service role from backend/Modal

-- ─────────────────────────────────────────────────────────────
-- PRIVACY, QUALITY, COMPLIANCE REPORTS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own privacy scores"
  ON privacy_scores FOR SELECT USING (
    EXISTS (SELECT 1 FROM synthetic_datasets sd
            WHERE sd.id = privacy_scores.synthetic_dataset_id
            AND sd.user_id = auth.uid())
  );

CREATE POLICY "Users can view own quality reports"
  ON quality_reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM synthetic_datasets sd
            WHERE sd.id = quality_reports.synthetic_dataset_id
            AND sd.user_id = auth.uid())
  );

CREATE POLICY "Users can view own compliance reports"
  ON compliance_reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM synthetic_datasets sd
            WHERE sd.id = compliance_reports.synthetic_dataset_id
            AND sd.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- MARKETPLACE LISTINGS (public read, private write)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Anyone can view active listings"
  ON marketplace_listings FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Sellers can view all their listings"
  ON marketplace_listings FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create listings"
  ON marketplace_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their listings"
  ON marketplace_listings FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their listings"
  ON marketplace_listings FOR DELETE USING (auth.uid() = seller_id);

-- ─────────────────────────────────────────────────────────────
-- PURCHASES
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Buyers can view their purchases"
  ON purchases FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view purchases of their listings"
  ON purchases FOR SELECT USING (auth.uid() = seller_id);

-- ─────────────────────────────────────────────────────────────
-- API KEYS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can deactivate own keys"
  ON api_keys FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- JOB LOGS
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view logs for their jobs"
  ON job_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM synthetic_datasets sd
            WHERE sd.id = job_logs.synthetic_dataset_id
            AND sd.user_id = auth.uid())
  );
```

---

## Storage Policies
### Run in Supabase SQL Editor — migrations/003_storage_policies.sql

```sql
-- Create buckets (also do this in Supabase dashboard)
INSERT INTO storage.buckets (id, name, public) VALUES ('datasets', 'datasets', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('synthetic', 'synthetic', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

-- ─────────────────────────────────────────────────────────────
-- DATASETS BUCKET
-- Path: datasets/{user_id}/{dataset_id}/filename.csv
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own dataset files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own dataset files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─────────────────────────────────────────────────────────────
-- SYNTHETIC BUCKET
-- Path: synthetic/{user_id}/{synthetic_id}/output.csv
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own synthetic files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'synthetic' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Buyers can also access purchased synthetic files
CREATE POLICY "Buyers can access purchased synthetic files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'synthetic' AND
    EXISTS (
      SELECT 1 FROM purchases p
      JOIN marketplace_listings ml ON ml.id = p.listing_id
      JOIN synthetic_datasets sd ON sd.id = ml.synthetic_dataset_id
      WHERE p.buyer_id = auth.uid()
      AND p.status = 'completed'
      AND ('synthetic/' || sd.user_id::text || '/' || sd.id::text) = 
          substring(name from 1 for length('synthetic/' || sd.user_id::text || '/' || sd.id::text))
    )
  );

-- ─────────────────────────────────────────────────────────────
-- REPORTS BUCKET
-- Path: reports/{user_id}/{synthetic_id}/compliance.pdf
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Realtime Configuration
Enable Realtime in Supabase dashboard for:
- `synthetic_datasets` — for job progress tracking
- `notifications` — for in-app notifications

Or via SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE synthetic_datasets;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## Indexes (Performance)
```sql
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_synthetic_datasets_original ON synthetic_datasets(original_dataset_id);
CREATE INDEX idx_synthetic_datasets_user ON synthetic_datasets(user_id);
CREATE INDEX idx_synthetic_datasets_status ON synthetic_datasets(status);
CREATE INDEX idx_marketplace_listings_active ON marketplace_listings(is_active, created_at DESC);
CREATE INDEX idx_marketplace_listings_category ON marketplace_listings(category, is_active);
CREATE INDEX idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_purchases_buyer ON purchases(buyer_id, status);
CREATE INDEX idx_purchases_seller ON purchases(seller_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_job_logs_job ON job_logs(job_id, created_at);
```
