-- ============================================================
-- GlowKey AI — Freemium migrations
-- Run these in Supabase SQL Editor (in order)
-- ============================================================

-- 1. Subscriptions table
-- Stores Stripe subscription status per user
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan               TEXT    NOT NULL DEFAULT 'premium',
  status             TEXT    NOT NULL DEFAULT 'active',
  -- 'active' | 'canceled' | 'past_due' | 'expired'
  expires_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only read their own row; only service role can write
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS automatically, so no INSERT policy needed for webhook

-- 2. Daily usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  scans        INT  NOT NULL DEFAULT 0,
  note_analysis INT NOT NULL DEFAULT 0,
  ask_ai       INT  NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. RPC function — atomic increment (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_date    DATE,
  p_field   TEXT  -- 'scans' | 'note_analysis' | 'ask_ai'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as DB owner, bypasses RLS for this operation
AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, date, scans, note_analysis, ask_ai)
  VALUES (p_user_id, p_date, 0, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  IF p_field = 'scans' THEN
    UPDATE usage_tracking
    SET scans = scans + 1
    WHERE user_id = p_user_id AND date = p_date;

  ELSIF p_field = 'note_analysis' THEN
    UPDATE usage_tracking
    SET note_analysis = note_analysis + 1
    WHERE user_id = p_user_id AND date = p_date;

  ELSIF p_field = 'ask_ai' THEN
    UPDATE usage_tracking
    SET ask_ai = ask_ai + 1
    WHERE user_id = p_user_id AND date = p_date;
  END IF;
END;
$$;

-- 4. Optional: auto-cleanup old usage rows (keep 30 days)
-- Run as a scheduled job in Supabase (pg_cron) if needed:
-- SELECT cron.schedule('cleanup-usage', '0 3 * * *',
--   $$DELETE FROM usage_tracking WHERE date < CURRENT_DATE - INTERVAL '30 days'$$);
