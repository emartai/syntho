-- ══════════════════════════════════════════════════════════════════════════════
-- 003_storage_policies.sql
-- Storage bucket policies — all buckets are PRIVATE
-- Run this in Supabase SQL Editor after creating the three buckets:
--   datasets, synthetic, reports (all set to private)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── datasets bucket ───────────────────────────────────────────────────────────
CREATE POLICY "Users can upload own datasets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'datasets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own dataset files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'datasets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own dataset files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'datasets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── synthetic bucket ──────────────────────────────────────────────────────────
CREATE POLICY "Users can view own synthetic files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'synthetic'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Service role can upload synthetic files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'synthetic');

CREATE POLICY "Users can delete own synthetic files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'synthetic'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── reports bucket ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own report files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Service role can upload report files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reports');
