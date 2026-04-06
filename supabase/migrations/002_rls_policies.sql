-- ══════════════════════════════════════════════════════════════════════════════
-- 002_rls_policies.sql
-- Row-Level Security for all Launch MVP tables
-- Rule: users read/write only their own rows (user_id = auth.uid())
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_datasets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs            ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── datasets ──────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own datasets"
  ON datasets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own datasets"
  ON datasets FOR DELETE
  USING (auth.uid() = user_id);

-- ── synthetic_datasets ────────────────────────────────────────────────────────
CREATE POLICY "Users can view own synthetic datasets"
  ON synthetic_datasets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synthetic datasets"
  ON synthetic_datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own synthetic datasets"
  ON synthetic_datasets FOR UPDATE
  USING (auth.uid() = user_id);

-- ── privacy_scores ────────────────────────────────────────────────────────────
-- Access via synthetic_datasets ownership check
CREATE POLICY "Users can view own privacy scores"
  ON privacy_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = privacy_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- ── quality_reports ───────────────────────────────────────────────────────────
CREATE POLICY "Users can view own quality reports"
  ON quality_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = quality_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- ── compliance_reports ────────────────────────────────────────────────────────
CREATE POLICY "Users can view own compliance reports"
  ON compliance_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = compliance_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- ── api_keys ──────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ── job_logs ──────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own job logs"
  ON job_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = job_logs.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );
