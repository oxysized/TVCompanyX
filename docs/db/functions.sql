-- Functions for cost calculation, commission, and helpers

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

-- Compatibility: calc_ad_cost(duration_seconds INT, base_price_per_min NUMERIC)
-- Some triggers call calc_ad_cost( duration, base_price ) so keep this wrapper
CREATE OR REPLACE FUNCTION calc_ad_cost(p_duration_seconds INT, p_base_price NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  minutes NUMERIC;
BEGIN
  IF p_base_price IS NULL THEN
    RETURN 0;
  END IF;
  minutes := CEIL(p_duration_seconds::numeric / 60.0);
  RETURN ROUND(minutes * p_base_price, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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


