-- ══════════════════════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- Core tables for Syntho MVP
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'payg')),
  jobs_quota      INT  NOT NULL DEFAULT 3,
  jobs_used_this_month INT NOT NULL DEFAULT 0,
  quota_reset_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  -- v2 fields
  flutterwave_subaccount_id TEXT,
  bank_account_verified BOOLEAN NOT NULL DEFAULT false,
  api_quota       INT  NOT NULL DEFAULT 1000,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── datasets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS datasets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  file_path     TEXT NOT NULL,
  file_size     BIGINT NOT NULL DEFAULT 0,
  file_type     TEXT NOT NULL,
  row_count     INT  NOT NULL DEFAULT 0,
  column_count  INT  NOT NULL DEFAULT 0,
  schema        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── synthetic_datasets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS synthetic_datasets (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_dataset_id  UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_method    TEXT NOT NULL CHECK (generation_method IN ('gaussian_copula', 'ctgan', 'tvae')),
  file_path            TEXT,
  row_count            INT,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  job_id               TEXT,
  progress             INT  NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message        TEXT,
  config               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── privacy_scores ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS privacy_scores (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id  UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  overall_score         NUMERIC(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  pii_detected          JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level            TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  details               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── quality_reports ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id  UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  correlation_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  distribution_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  overall_score         NUMERIC(5,2) NOT NULL DEFAULT 0,
  column_stats          JSONB NOT NULL DEFAULT '{}'::jsonb,
  passed                BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── compliance_reports ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id  UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  report_type           TEXT NOT NULL DEFAULT 'combined' CHECK (report_type IN ('gdpr', 'hipaa', 'combined')),
  file_path             TEXT,
  passed                BOOLEAN NOT NULL DEFAULT false,
  gdpr_passed           BOOLEAN,
  hipaa_passed          BOOLEAN,
  findings              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── job_logs ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id  UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  event                 TEXT NOT NULL,
  message               TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── waitlist ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL DEFAULT 'Pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── v2 tables (created now, gated behind feature flags) ───────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,
  scopes       TEXT[] NOT NULL DEFAULT '{}',
  usage_count  INT  NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  synthetic_dataset_id UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  category             TEXT,
  price                NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'USD',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  download_count       INT  NOT NULL DEFAULT 0,
  preview_schema       JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id          UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'USD',
  flutterwave_tx_ref  TEXT NOT NULL UNIQUE,
  flutterwave_tx_id   TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auto-update updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synthetic_datasets_updated_at
  BEFORE UPDATE ON synthetic_datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Auto-create profile on signup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
