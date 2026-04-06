-- ══════════════════════════════════════════════════════════════════════════════
-- 004_freemium_quota.sql
-- Monthly quota reset + job counter trigger
-- ══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Monthly quota reset ────────────────────────────────────────────────────────
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

-- Schedule at 00:00 on day 1 of every month.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-monthly-quotas') THEN
    PERFORM cron.unschedule('reset-monthly-quotas');
  END IF;

  PERFORM cron.schedule(
    'reset-monthly-quotas',
    '0 0 1 * *',
    'SELECT reset_monthly_quotas()'
  );
END;
$$;

-- ── Job counter trigger ────────────────────────────────────────────────────────
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
