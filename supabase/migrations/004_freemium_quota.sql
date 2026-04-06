-- ══════════════════════════════════════════════════════════════════════════════
-- 004_freemium_quota.sql
-- trust_scores table + monthly quota reset + job counter trigger
-- ══════════════════════════════════════════════════════════════════════════════

-- ── trust_scores (composite score per synthetic dataset) ──────────────────────
-- composite_score = (privacy_score × 0.40) + (fidelity_score × 0.40) + (compliance_score × 0.20)
-- clamped 0–100. Label: 90–100 Excellent, 75–89 Good, 60–74 Fair, 0–59 Needs Improvement
CREATE TABLE IF NOT EXISTS trust_scores (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synthetic_dataset_id UUID NOT NULL REFERENCES synthetic_datasets(id) ON DELETE CASCADE UNIQUE,
  composite_score      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (composite_score >= 0 AND composite_score <= 100),
  privacy_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
  fidelity_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  compliance_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  label                TEXT NOT NULL DEFAULT 'Needs Improvement'
                         CHECK (label IN ('Excellent', 'Good', 'Fair', 'Needs Improvement')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for trust_scores
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trust scores"
  ON trust_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = trust_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- ── Monthly quota reset ────────────────────────────────────────────────────────
-- Resets jobs_used_this_month to 0 for all profiles whose reset date has passed.
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

-- Schedule via pg_cron (enable pg_cron extension: Database → Extensions → pg_cron)
-- After enabling, run once in SQL Editor:
-- SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas()');

-- ── Job counter trigger ────────────────────────────────────────────────────────
-- Increments profiles.jobs_used_this_month when a new generation job is created.
-- The backend enforces the quota before INSERT; this keeps the count accurate.
CREATE OR REPLACE FUNCTION increment_jobs_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET jobs_used_this_month = jobs_used_this_month + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_synthetic_dataset_created ON synthetic_datasets;
CREATE TRIGGER on_synthetic_dataset_created
  AFTER INSERT ON synthetic_datasets
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION increment_jobs_used();
