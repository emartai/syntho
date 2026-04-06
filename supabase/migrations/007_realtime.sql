-- ══════════════════════════════════════════════════════════════════════════════
-- 007_realtime.sql
-- Enable Supabase Realtime for live job progress and notifications
-- Run in Supabase SQL Editor. Also enable via Dashboard → Database → Replication.
-- ══════════════════════════════════════════════════════════════════════════════

-- synthetic_datasets: drives the live progress bar in the generate page
ALTER PUBLICATION supabase_realtime ADD TABLE synthetic_datasets;

-- notifications: drives the notification bell badge in the dashboard navbar
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- job_logs: optional — streams log lines to the generate page terminal view
ALTER PUBLICATION supabase_realtime ADD TABLE job_logs;
