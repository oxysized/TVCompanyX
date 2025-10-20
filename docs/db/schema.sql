-- PostgreSQL schema for TV Company Ad System
-- Run order: schema.sql -> functions.sql -> triggers.sql -> seed.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core entities
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer','agent','commercial','accountant','admin','director')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  bank_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  base_price_per_min NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TYPE application_status AS ENUM ('pending','sent_to_commercial','approved','rejected','paid','overdue');

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

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, application_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Services feed (public services list)
CREATE TABLE IF NOT EXISTS services_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  show_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL,
  cost NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed','scheduled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit table example
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);


