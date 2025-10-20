-- Functions for cost calculation, commission, and helpers

-- Calculate ad cost from duration (sec) and base price per minute
CREATE OR REPLACE FUNCTION calc_ad_cost(duration_seconds INT, base_price_per_min NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  minutes NUMERIC := duration_seconds / 60.0;
BEGIN
  RETURN ROUND(minutes * base_price_per_min, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get default agent commission percent
CREATE OR REPLACE FUNCTION default_agent_commission()
RETURNS NUMERIC AS $$
BEGIN
  RETURN 5.0; -- 5%
END;
$$ LANGUAGE plpgsql STABLE;

-- Upsert commission record for approved application
CREATE OR REPLACE FUNCTION upsert_commission(p_application_id UUID, p_agent_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
DECLARE
  pct NUMERIC := default_agent_commission();
BEGIN
  IF p_agent_id IS NULL THEN
    RETURN; -- no agent
  END IF;
  INSERT INTO commissions (agent_id, application_id, percent, amount)
  VALUES (p_agent_id, p_application_id, pct, ROUND(p_amount * pct / 100.0, 2))
  ON CONFLICT (agent_id, application_id)
  DO UPDATE SET amount = EXCLUDED.amount, percent = EXCLUDED.percent;
END;
$$ LANGUAGE plpgsql;

-- Create notification
CREATE OR REPLACE FUNCTION notify_user(p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message) VALUES (p_user_id, p_type, p_title, p_message);
END;
$$ LANGUAGE plpgsql;

-- Publish to services feed when application approved/paid
CREATE OR REPLACE FUNCTION upsert_services_feed(p_application_id UUID)
RETURNS VOID AS $$
DECLARE
  app RECORD;
  sh RECORD;
  cust RECORD;
  feed_status TEXT;
BEGIN
  SELECT * INTO app FROM applications WHERE id = p_application_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO sh FROM shows WHERE id = app.show_id;
  SELECT id, name INTO cust FROM users WHERE id = app.customer_id;
  
  feed_status := CASE WHEN app.status IN ('approved','paid') THEN 'scheduled' ELSE 'completed' END;
  
  INSERT INTO services_feed (application_id, show_name, client_name, date, duration_seconds, cost, status)
  VALUES (app.id, sh.name, cust.name, app.scheduled_at, app.duration_seconds, app.cost, feed_status)
  ON CONFLICT (application_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Audit helper
CREATE OR REPLACE FUNCTION add_audit(entity TEXT, entity_id UUID, action TEXT, actor UUID, payload JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log(entity, entity_id, action, changed_by, payload) VALUES (entity, entity_id, action, actor, payload);
END;
$$ LANGUAGE plpgsql;


