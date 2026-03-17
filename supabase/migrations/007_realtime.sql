-- Enable Realtime for synthetic_datasets so the progress bar updates via Supabase subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE synthetic_datasets;

-- Also enable for job_logs so log inserts stream in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE job_logs;
