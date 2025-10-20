-- Triggers for automatic updates and consistency

-- updated_at maintenance
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shows_updated BEFORE UPDATE ON shows
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_schedule_updated BEFORE UPDATE ON show_schedule
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Calculate cost on insert/update from show base price
CREATE OR REPLACE FUNCTION set_application_cost()
RETURNS TRIGGER AS $$
DECLARE
  base NUMERIC;
BEGIN
  SELECT base_price_per_min INTO base FROM shows WHERE id = NEW.show_id;
  IF base IS NULL THEN
    RAISE EXCEPTION 'Show not found for id %', NEW.show_id;
  END IF;
  NEW.cost := calc_ad_cost(NEW.duration_seconds, base);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_set_cost BEFORE INSERT OR UPDATE OF show_id, duration_seconds ON applications
FOR EACH ROW EXECUTE FUNCTION set_application_cost();

-- Ensure schedule slots are available when moving to approved
CREATE OR REPLACE FUNCTION verify_slots_and_update_feed()
RETURNS TRIGGER AS $$
DECLARE
  sched RECORD;
  minutes_needed INT := CEIL(NEW.duration_seconds / 60.0);
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT * INTO sched
    FROM show_schedule
    WHERE show_id = NEW.show_id AND scheduled_date = (NEW.scheduled_at AT TIME ZONE 'utc')::date
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No schedule for selected date';
    END IF;

    IF sched.available_slots < minutes_needed THEN
      RAISE EXCEPTION 'Not enough ad slots';
    END IF;

    UPDATE show_schedule SET available_slots = sched.available_slots - minutes_needed, updated_at = now() WHERE id = sched.id;

    PERFORM upsert_services_feed(NEW.id);
    PERFORM upsert_commission(NEW.id, NEW.agent_id, NEW.cost);
  END IF;

  -- overdue detection
  IF NEW.status = 'approved' AND NEW.due_date IS NOT NULL AND NEW.due_date < now() THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_after_status BEFORE UPDATE OF status ON applications
FOR EACH ROW EXECUTE FUNCTION verify_slots_and_update_feed();

-- Notifications
CREATE OR REPLACE FUNCTION application_status_notify()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    PERFORM notify_user(NEW.customer_id, 'application', 'Ваша заявка одобрена', 'Заявка одобрена и запланирована');
  ELSIF NEW.status = 'rejected' THEN
    PERFORM notify_user(NEW.customer_id, 'application', 'Ваша заявка отклонена', 'Проверьте детали заявки');
  ELSIF NEW.status = 'paid' THEN
    PERFORM notify_user(NEW.customer_id, 'billing', 'Оплата получена', 'Спасибо за оплату');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_notify AFTER UPDATE OF status ON applications
FOR EACH ROW EXECUTE FUNCTION application_status_notify();


