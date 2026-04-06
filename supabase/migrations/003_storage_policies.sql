-- ══════════════════════════════════════════════════════════════════════════════
-- 003_storage_policies.sql
-- Storage buckets + policies (private buckets)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('datasets', 'datasets', false),
  ('synthetic', 'synthetic', false),
  ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- datasets
DROP POLICY IF EXISTS "Users can upload own datasets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own dataset files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own dataset files" ON storage.objects;

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

-- synthetic
DROP POLICY IF EXISTS "Users can upload own synthetic files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own synthetic files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own synthetic files" ON storage.objects;

CREATE POLICY "Users can upload own synthetic files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'synthetic'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own synthetic files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'synthetic'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own synthetic files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'synthetic'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- reports
DROP POLICY IF EXISTS "Users can upload own report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own report files" ON storage.objects;

CREATE POLICY "Users can upload own report files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own report files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own report files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
