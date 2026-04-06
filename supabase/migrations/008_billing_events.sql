-- 008_billing_events.sql
-- Billing events for subscription upgrades and payment history

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'growth')),
  tx_ref TEXT NOT NULL UNIQUE,
  transaction_id TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
  source TEXT NOT NULL DEFAULT 'checkout' CHECK (source IN ('checkout', 'webhook')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing events" ON billing_events;
DROP POLICY IF EXISTS "Users can insert own billing events" ON billing_events;
DROP POLICY IF EXISTS "Users can update own billing events" ON billing_events;

CREATE POLICY "Users can view own billing events"
  ON billing_events FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own billing events"
  ON billing_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own billing events"
  ON billing_events FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_billing_events_user_created ON billing_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_tx_ref ON billing_events(tx_ref);
