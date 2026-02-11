-- BoothBot Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants (account owners)
CREATE TABLE bb_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_email ON bb_tenants(email);

-- Bots (Telegram bot instances)
CREATE TABLE bb_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES bb_tenants(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  owner_telegram_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bots_tenant_id ON bb_bots(tenant_id);
CREATE INDEX idx_bots_username ON bb_bots(username);

-- Events (conferences/booths)
CREATE TABLE bb_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bb_bots(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_bot_id ON bb_events(bot_id);
CREATE INDEX idx_events_start_date ON bb_events(start_date);

-- Visitors (captured leads)
CREATE TABLE bb_visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES bb_events(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  telegram_username VARCHAR(255),
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  wallet_address VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visitors_event_id ON bb_visitors(event_id);
CREATE INDEX idx_visitors_telegram_id ON bb_visitors(event_id, telegram_id);
CREATE INDEX idx_visitors_created_at ON bb_visitors(created_at);

-- Broadcasts (message history)
CREATE TABLE bb_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES bb_events(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_event_id ON bb_broadcasts(event_id);
CREATE INDEX idx_broadcasts_created_at ON bb_broadcasts(created_at);

-- Row Level Security (RLS) Policies
-- Note: For MVP, we handle authorization in application layer
-- Uncomment these if you want database-level security

-- ALTER TABLE bb_tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bb_bots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bb_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bb_visitors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bb_broadcasts ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for bots (owner can only see their bots)
-- CREATE POLICY "Tenants can view their own bots" ON bb_bots
--   FOR SELECT USING (tenant_id = auth.uid());

-- Views for common queries
CREATE OR REPLACE VIEW bb_event_stats AS
SELECT
  e.id AS event_id,
  e.name AS event_name,
  e.bot_id,
  COUNT(DISTINCT v.id) AS total_visitors,
  COUNT(DISTINCT CASE WHEN v.created_at >= NOW() - INTERVAL '24 hours' THEN v.id END) AS visitors_today,
  COUNT(DISTINCT CASE WHEN v.created_at >= NOW() - INTERVAL '7 days' THEN v.id END) AS visitors_this_week,
  MAX(v.created_at) AS last_visitor_at
FROM bb_events e
LEFT JOIN bb_visitors v ON v.event_id = e.id
GROUP BY e.id, e.name, e.bot_id;

-- Function to get bot visitor count
CREATE OR REPLACE FUNCTION get_bot_visitor_count(bot_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT v.id)::INTEGER
  FROM bb_visitors v
  JOIN bb_events e ON e.id = v.event_id
  WHERE e.bot_id = bot_uuid;
$$ LANGUAGE sql STABLE;

-- Function to check if bot is within billing limits
CREATE OR REPLACE FUNCTION check_bot_limits(bot_uuid UUID)
RETURNS TABLE(
  is_within_limits BOOLEAN,
  age_days INTEGER,
  visitor_count INTEGER
) AS $$
  SELECT
    (EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 86400)::INTEGER <= 7
      AND get_bot_visitor_count(bot_uuid) < 100 AS is_within_limits,
    (EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 86400)::INTEGER AS age_days,
    get_bot_visitor_count(bot_uuid) AS visitor_count
  FROM bb_bots b
  WHERE b.id = bot_uuid;
$$ LANGUAGE sql STABLE;
