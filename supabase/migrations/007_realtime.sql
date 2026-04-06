-- ══════════════════════════════════════════════════════════════════════════════
-- 007_realtime.sql
-- Enable Supabase Realtime for live job progress and notifications
-- Run in Supabase SQL Editor. Also enable via Dashboard → Database → Replication.
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE synthetic_datasets;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE job_logs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
