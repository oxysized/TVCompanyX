-- Full init schema for TVCompanyX
-- Run this on a clean PostgreSQL database to recreate schema expected by the application code.
-- WARNING: This will create tables and functions. Run on an empty database or after backing up existing data.

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM ('pending','in_progress','sent_to_commercial','approved','rejected','paid','overdue');
  END IF;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer','agent','commercial','accountant','admin','director')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  bank_details JSONB,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Shows
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  base_price_per_min NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Show schedule
CREATE TABLE IF NOT EXISTS show_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  ad_minutes INT NOT NULL CHECK (ad_minutes >= 0),
  available_slots INT NOT NULL CHECK (available_slots >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (show_id, scheduled_date)
);

-- Master applications table (optional master record). The application may also live in workflow tables depending on app logic.
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL CHECK (duration_seconds BETWEEN 5 AND 300),
  status application_status NOT NULL DEFAULT 'pending',
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT,
  contact_phone TEXT,
  payment_method TEXT CHECK (payment_method IN ('card','transfer','cash')),
  payment_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow tables
CREATE TABLE IF NOT EXISTS pending_applications (LIKE applications INCLUDING ALL);
ALTER TABLE pending_applications ALTER COLUMN status SET DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS approved_applications (LIKE applications INCLUDING ALL);
ALTER TABLE approved_applications ALTER COLUMN status SET DEFAULT 'approved';

CREATE TABLE IF NOT EXISTS rejected_applications (LIKE applications INCLUDING ALL);
ALTER TABLE rejected_applications ALTER COLUMN status SET DEFAULT 'rejected';

-- Commissions (no FK on application_id to avoid FK errors when application rows are moved between workflow tables)
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL,
  percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, application_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Services feed (no FK to applications for same reason)
CREATE TABLE IF NOT EXISTS services_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL,
  show_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL,
  cost NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed','scheduled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT NOT NULL,
  sender_id UUID,
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);

-- Functions
-- calculate_ad_cost(duration_seconds INT, p_show_id UUID) -> numeric
CREATE OR REPLACE FUNCTION calculate_ad_cost(p_duration_seconds INT, p_show_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  minutes NUMERIC;
  base_price NUMERIC := 0;
BEGIN
  SELECT base_price_per_min INTO base_price FROM shows WHERE id = p_show_id;
  IF NOT FOUND OR base_price IS NULL THEN
    RETURN 0;
  END IF;
  minutes := CEIL(p_duration_seconds::numeric / 60.0);
  RETURN ROUND(minutes * base_price, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- default agent commission
CREATE OR REPLACE FUNCTION default_agent_commission()
RETURNS NUMERIC AS $$
BEGIN
  RETURN 5.0; -- percent
END;
$$ LANGUAGE plpgsql STABLE;

-- upsert_commission(p_application_id, p_agent_id, p_amount)
CREATE OR REPLACE FUNCTION upsert_commission(p_application_id UUID, p_agent_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
DECLARE
  pct NUMERIC := default_agent_commission();
  computed_amount NUMERIC;
BEGIN
  IF p_agent_id IS NULL THEN
    RETURN;
  END IF;
  computed_amount := ROUND((p_amount * pct / 100.0)::numeric, 2);
  INSERT INTO commissions (agent_id, application_id, percent, amount, created_at)
  VALUES (p_agent_id, p_application_id, pct, computed_amount, now())
  ON CONFLICT (agent_id, application_id)
  DO UPDATE SET amount = EXCLUDED.amount, percent = EXCLUDED.percent;
END;
$$ LANGUAGE plpgsql;

-- notify_user
CREATE OR REPLACE FUNCTION notify_user(p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message) VALUES (p_user_id, p_type, p_title, p_message);
END;
$$ LANGUAGE plpgsql;

-- upsert_services_feed: find the application in any of the application/workflow tables
CREATE OR REPLACE FUNCTION upsert_services_feed(p_application_id UUID)
RETURNS VOID AS $$
DECLARE
  app RECORD;
  sh RECORD;
  cust RECORD;
  feed_status TEXT;
BEGIN
  SELECT * INTO app FROM (
    SELECT * FROM applications WHERE id = p_application_id
    UNION ALL
    SELECT * FROM pending_applications WHERE id = p_application_id
    UNION ALL
    SELECT * FROM approved_applications WHERE id = p_application_id
    UNION ALL
    SELECT * FROM rejected_applications WHERE id = p_application_id
    LIMIT 1
  ) t;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO sh FROM shows WHERE id = app.show_id;
  SELECT id, first_name, middle_name, last_name, name INTO cust FROM users WHERE id = app.customer_id;

  IF app.status IN ('approved','paid') THEN
    feed_status := 'scheduled';
  ELSE
    feed_status := 'completed';
  END IF;

  INSERT INTO services_feed (application_id, show_name, client_name, date, duration_seconds, cost, status, created_at)
  VALUES (
    app.id,
    COALESCE(sh.name, ''),
    COALESCE(
      NULLIF(TRIM(COALESCE(cust.first_name, '') || ' ' || COALESCE(cust.last_name, '')), ''),
      COALESCE(cust.name, 'Unknown')
    ),
    app.scheduled_at,
    app.duration_seconds,
    app.cost,
    feed_status,
    now()
  ) ON CONFLICT (application_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- add_audit helper
CREATE OR REPLACE FUNCTION add_audit(entity TEXT, entity_id UUID, action TEXT, actor UUID, payload JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log(entity, entity_id, action, changed_by, payload) VALUES (entity, entity_id, action, actor, payload);
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- End of schema
