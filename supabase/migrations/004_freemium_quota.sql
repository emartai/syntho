-- ══════════════════════════════════════════════════════════════════════════════
-- 004_freemium_quota.sql
-- Monthly quota reset function + cron job
-- ══════════════════════════════════════════════════════════════════════════════

-- Function to reset monthly job quotas
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    jobs_used_this_month = 0,
    quota_reset_at = NOW() + INTERVAL '30 days'
  WHERE quota_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule via pg_cron (enable pg_cron extension in Supabase dashboard first)
-- SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas()');

-- Ensure free plan defaults are correct
UPDATE profiles
SET
  plan = 'free',
  jobs_quota = 3
WHERE plan IS NULL OR plan = '';

-- Add plan check constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
      CHECK (plan IN ('free', 'pro', 'payg'));
  END IF;
END $$;
