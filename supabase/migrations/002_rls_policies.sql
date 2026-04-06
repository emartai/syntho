-- ══════════════════════════════════════════════════════════════════════════════
-- 002_rls_policies.sql
-- Row-Level Security for all Launch MVP tables
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'admin'
  );
END;
$$;

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_datasets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs            ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- datasets
DROP POLICY IF EXISTS "Users can view own datasets" ON datasets;
DROP POLICY IF EXISTS "Users can insert own datasets" ON datasets;
DROP POLICY IF EXISTS "Users can update own datasets" ON datasets;
DROP POLICY IF EXISTS "Users can delete own datasets" ON datasets;

CREATE POLICY "Users can view own datasets"
  ON datasets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own datasets"
  ON datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own datasets"
  ON datasets FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own datasets"
  ON datasets FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- synthetic_datasets
DROP POLICY IF EXISTS "Users can view own synthetic datasets" ON synthetic_datasets;
DROP POLICY IF EXISTS "Users can insert own synthetic datasets" ON synthetic_datasets;
DROP POLICY IF EXISTS "Users can update own synthetic datasets" ON synthetic_datasets;
DROP POLICY IF EXISTS "Users can delete own synthetic datasets" ON synthetic_datasets;

CREATE POLICY "Users can view own synthetic datasets"
  ON synthetic_datasets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own synthetic datasets"
  ON synthetic_datasets FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own synthetic datasets"
  ON synthetic_datasets FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own synthetic datasets"
  ON synthetic_datasets FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- privacy_scores
DROP POLICY IF EXISTS "Users can view own privacy scores" ON privacy_scores;
DROP POLICY IF EXISTS "Users can insert own privacy scores" ON privacy_scores;
DROP POLICY IF EXISTS "Users can update own privacy scores" ON privacy_scores;
DROP POLICY IF EXISTS "Users can delete own privacy scores" ON privacy_scores;

CREATE POLICY "Users can view own privacy scores"
  ON privacy_scores FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = privacy_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own privacy scores"
  ON privacy_scores FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = privacy_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own privacy scores"
  ON privacy_scores FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = privacy_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = privacy_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own privacy scores"
  ON privacy_scores FOR DELETE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = privacy_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- quality_reports
DROP POLICY IF EXISTS "Users can view own quality reports" ON quality_reports;
DROP POLICY IF EXISTS "Users can insert own quality reports" ON quality_reports;
DROP POLICY IF EXISTS "Users can update own quality reports" ON quality_reports;
DROP POLICY IF EXISTS "Users can delete own quality reports" ON quality_reports;

CREATE POLICY "Users can view own quality reports"
  ON quality_reports FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = quality_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own quality reports"
  ON quality_reports FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = quality_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own quality reports"
  ON quality_reports FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = quality_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = quality_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own quality reports"
  ON quality_reports FOR DELETE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = quality_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- compliance_reports
DROP POLICY IF EXISTS "Users can view own compliance reports" ON compliance_reports;
DROP POLICY IF EXISTS "Users can insert own compliance reports" ON compliance_reports;
DROP POLICY IF EXISTS "Users can update own compliance reports" ON compliance_reports;
DROP POLICY IF EXISTS "Users can delete own compliance reports" ON compliance_reports;

CREATE POLICY "Users can view own compliance reports"
  ON compliance_reports FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = compliance_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own compliance reports"
  ON compliance_reports FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = compliance_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own compliance reports"
  ON compliance_reports FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = compliance_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = compliance_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own compliance reports"
  ON compliance_reports FOR DELETE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = compliance_reports.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- trust_scores
DROP POLICY IF EXISTS "Users can read own trust scores" ON trust_scores;
DROP POLICY IF EXISTS "Users can insert own trust scores" ON trust_scores;
DROP POLICY IF EXISTS "Users can update own trust scores" ON trust_scores;
DROP POLICY IF EXISTS "Users can delete own trust scores" ON trust_scores;

CREATE POLICY "Users can read own trust scores"
  ON trust_scores FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = trust_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trust scores"
  ON trust_scores FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = trust_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trust scores"
  ON trust_scores FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = trust_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = trust_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trust scores"
  ON trust_scores FOR DELETE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = trust_scores.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

-- api_keys
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON api_keys;

CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can mark own notifications read" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- job_logs
DROP POLICY IF EXISTS "Users can view own job logs" ON job_logs;
DROP POLICY IF EXISTS "Users can insert own job logs" ON job_logs;
DROP POLICY IF EXISTS "Users can update own job logs" ON job_logs;
DROP POLICY IF EXISTS "Users can delete own job logs" ON job_logs;

CREATE POLICY "Users can view own job logs"
  ON job_logs FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = job_logs.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own job logs"
  ON job_logs FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = job_logs.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own job logs"
  ON job_logs FOR UPDATE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = job_logs.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = job_logs.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own job logs"
  ON job_logs FOR DELETE
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM synthetic_datasets sd
      WHERE sd.id = job_logs.synthetic_dataset_id
        AND sd.user_id = auth.uid()
    )
  );
