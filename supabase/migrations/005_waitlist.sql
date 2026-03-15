-- ══════════════════════════════════════════════════════════════════════════════
-- 005_waitlist.sql
-- Waitlist table for pre-launch signups
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL DEFAULT 'Pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join
CREATE POLICY "Public waitlist insert"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- Public read (no sensitive data in waitlist)
CREATE POLICY "Public waitlist read"
  ON waitlist FOR SELECT
  USING (true);
