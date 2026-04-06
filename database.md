# Syntho — Database Reference
## Launch MVP Schema — SQL, RLS, Storage Policies, Realtime

> All migrations live in `supabase/migrations/`. Run them in order in Supabase SQL Editor.

---

## Migration 001 — Core Schema

```sql
-- ══════════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- ══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── profiles (auto-created on signup via trigger) ─────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'growth')),
  jobs_used_this_month INT NOT NULL DEFAULT 0,
  quota_reset_at  TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── datasets (original uploaded files) ───────────────────────────
CREATE TABLE IF NOT EXISTS datasets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  file_path     TEXT NOT NULL,
  file_size     BIGINT NOT NULL DEFAULT 0,
  file_type     TEXT NOT NULL CHECK (file_type IN ('csv', 'json', 'parquet', 'xlsx')),
  row_count     INT NOT NULL DEFAULT 0,
  column_count  INT NOT NULL DEFAULT 0,
  schema        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status        TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── synthetic_datasets (generated outputs) ───────────────────────
CREATE TABLE IF NOT EXISTS synthetic_datasets (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_dataset_id  UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_method    TEXT NOT NULL CHECK (generation_method IN ('ctgan', 'gaussian_copula')),
  file_path            TEXT,
  row_count            INT,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress             INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  error_message        TEXT,
  config               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── trust_scores (composite 0–100 score per synthetic dataset) ───
-- Formula: (privacy × 0.40) + (fidelity × 0.40) + (compliance × 0.20)
CREATE TABLE IF NOT EXISTS trust_scores (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE UNIQUE,
  composite_score      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (composite_score BETWEEN 0 AND 100),
  privacy_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
  fidelity_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  compliance_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  label                TEXT,  -- 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── privacy_scores ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS privacy_scores (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  overall_score        NUMERIC(5,2) CHECK (overall_score BETWEEN 0 AND 100),
  pii_detected         JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level           TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  singling_out_risk    NUMERIC(5,2),
  linkability_risk     NUMERIC(5,2),
  details              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── quality_reports ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_reports (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  correlation_score    NUMERIC(5,2),
  distribution_score   NUMERIC(5,2),
  overall_score        NUMERIC(5,2),
  column_stats         JSONB NOT NULL DEFAULT '[]'::jsonb,
  passed               BOOLEAN,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── compliance_reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_reports (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  report_type          TEXT NOT NULL DEFAULT 'combined' CHECK (report_type IN ('gdpr', 'hipaa', 'combined')),
  file_path            TEXT,
  passed               BOOLEAN,
  gdpr_passed          BOOLEAN,
  hipaa_passed         BOOLEAN,
  findings             JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── api_keys (Pro/Growth plans only) ─────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT UNIQUE NOT NULL,   -- SHA-256 of raw key, never store raw
  key_prefix   TEXT NOT NULL,          -- first 12 chars for display
  scopes       TEXT[] NOT NULL DEFAULT ARRAY['generate', 'read'],
  usage_count  INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── notifications (Launch feature) ───────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('job_complete', 'job_failed', 'quota_warning', 'quota_exhausted')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── job_logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_logs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id UUID REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  event                TEXT NOT NULL,
  message              TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at          BEFORE UPDATE ON profiles          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER datasets_updated_at          BEFORE UPDATE ON datasets          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER synthetic_datasets_updated_at BEFORE UPDATE ON synthetic_datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Migration 002 — RLS Policies

```sql
-- ══════════════════════════════════════════════════════════════════
-- 002_rls_policies.sql
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_datasets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs             ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- datasets
CREATE POLICY "Users can view own datasets"   ON datasets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own datasets" ON datasets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own datasets" ON datasets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own datasets" ON datasets FOR DELETE USING (auth.uid() = user_id);

-- synthetic_datasets
CREATE POLICY "Users can view own synthetic datasets"   ON synthetic_datasets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own synthetic datasets" ON synthetic_datasets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- trust_scores (via synthetic_datasets ownership)
CREATE POLICY "Users can view own trust scores" ON trust_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM synthetic_datasets sd WHERE sd.id = trust_scores.synthetic_dataset_id AND sd.user_id = auth.uid())
);

-- privacy_scores
CREATE POLICY "Users can view own privacy scores" ON privacy_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM synthetic_datasets sd WHERE sd.id = privacy_scores.synthetic_dataset_id AND sd.user_id = auth.uid())
);

-- quality_reports
CREATE POLICY "Users can view own quality reports" ON quality_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM synthetic_datasets sd WHERE sd.id = quality_reports.synthetic_dataset_id AND sd.user_id = auth.uid())
);

-- compliance_reports
CREATE POLICY "Users can view own compliance reports" ON compliance_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM synthetic_datasets sd WHERE sd.id = compliance_reports.synthetic_dataset_id AND sd.user_id = auth.uid())
);

-- api_keys
CREATE POLICY "Users can view own API keys"    ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own API keys"  ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can deactivate own keys"  ON api_keys FOR UPDATE USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "Users can view own notifications"       ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own notifications read"  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- job_logs
CREATE POLICY "Users can view own job logs" ON job_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM synthetic_datasets sd WHERE sd.id = job_logs.synthetic_dataset_id AND sd.user_id = auth.uid())
);
```

---

## Migration 003 — Storage Policies

```sql
-- ══════════════════════════════════════════════════════════════════
-- 003_storage_policies.sql
-- ══════════════════════════════════════════════════════════════════

-- Create buckets (also create in Supabase Dashboard → Storage)
INSERT INTO storage.buckets (id, name, public) VALUES ('datasets', 'datasets', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('synthetic', 'synthetic', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false) ON CONFLICT DO NOTHING;

-- Path format: {bucket}/{user_id}/{resource_id}/filename.ext

-- datasets bucket
CREATE POLICY "Users can upload own dataset files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own dataset files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own dataset files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- synthetic bucket
CREATE POLICY "Users can view own synthetic files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'synthetic' AND auth.uid()::text = (storage.foldername(name))[1]);

-- reports bucket
CREATE POLICY "Users can view own report files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Migration 004 — Freemium Quota + Trust Scores

```sql
-- ══════════════════════════════════════════════════════════════════
-- 004_freemium_quota.sql
-- ══════════════════════════════════════════════════════════════════

-- Monthly quota reset function (called by pg_cron on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    jobs_used_this_month = 0,
    quota_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
  WHERE quota_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron in Supabase Dashboard → Database → Extensions → pg_cron
-- Then run this once:
-- SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas()');
```

---

## Migration 005 — Indexes

```sql
-- ══════════════════════════════════════════════════════════════════
-- 005_indexes.sql
-- ══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_datasets_user_id          ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_status            ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at        ON datasets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_synthetic_user_id          ON synthetic_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_original         ON synthetic_datasets(original_dataset_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_status           ON synthetic_datasets(status);
CREATE INDEX IF NOT EXISTS idx_synthetic_created_at       ON synthetic_datasets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_scores_synthetic     ON trust_scores(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_privacy_scores_synthetic   ON privacy_scores(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_quality_reports_synthetic  ON quality_reports(synthetic_dataset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_synthetic       ON compliance_reports(synthetic_dataset_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id           ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash              ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_notifications_user         ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_synthetic         ON job_logs(synthetic_dataset_id, created_at);
```

---

## Realtime Configuration

Enable in Supabase Dashboard → Database → Replication → Supabase Realtime, or run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE synthetic_datasets;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

Used by:
- `hooks/useJobProgress.ts` — subscribes to `synthetic_datasets` for live progress
- `hooks/useNotifications.ts` — subscribes to `notifications` for in-app alerts

---

## Table Summary

| Table | Purpose |
|-------|---------|
| profiles | User accounts, plan, quota usage |
| datasets | Original uploaded files + schema |
| synthetic_datasets | Generation jobs + status + file path |
| trust_scores | **Composite 0–100 score** (Privacy×0.40 + Fidelity×0.40 + Compliance×0.20) |
| privacy_scores | Presidio PII detection, singling-out, linkability |
| quality_reports | Correlation + distribution fidelity scores |
| compliance_reports | GDPR/HIPAA check results + PDF path |
| api_keys | Pro/Growth user API keys (hashed) |
| notifications | In-app alerts (job_complete, quota_warning, etc.) |
| job_logs | Timestamped ML pipeline events per job |

---

## Key Patterns

### Always use .limit(1) not .single()
`.single()` throws HTTP 406 when no row found. Always:
```python
response = supabase.table("profiles").select("*").eq("id", user_id).limit(1).execute()
profile = response.data[0] if response.data else None
```

### Storage paths
```
datasets/{user_id}/{dataset_id}/{uuid}.{ext}
synthetic/{user_id}/{synthetic_id}/data.csv
reports/{user_id}/{synthetic_id}/compliance.pdf
datasets/sample/nigerian_retail_sample.csv   ← onboarding sample
```

### Trust score labels
```
90–100 → "Excellent"
75–89  → "Good"
60–74  → "Fair"
0–59   → "Needs Improvement"
```
