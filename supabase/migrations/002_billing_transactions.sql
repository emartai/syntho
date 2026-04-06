-- Billing transactions used for subscription upgrades
CREATE TABLE IF NOT EXISTS billing_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan              TEXT NOT NULL CHECK (plan IN ('pro', 'growth')),
  amount            INT NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'NGN',
  status            TEXT NOT NULL DEFAULT 'successful',
  flutterwave_tx_ref TEXT NOT NULL UNIQUE,
  flutterwave_tx_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id
  ON billing_transactions(user_id, created_at DESC);
