-- Seed minimal data for local development

INSERT INTO users (name, email, role)
VALUES
  ('Demo Customer', 'customer@example.com', 'customer'),
  ('Demo Agent', 'agent@example.com', 'agent'),
  ('Demo Commercial', 'commercial@example.com', 'commercial'),
  ('Demo Accountant', 'accountant@example.com', 'accountant'),
  ('Demo Admin', 'admin@example.com', 'admin'),
  ('Demo Director', 'director@example.com', 'director')
ON CONFLICT DO NOTHING;

INSERT INTO shows (name, time_slot, base_price_per_min)
VALUES
  ('Утреннее шоу', '08:00-10:00', 10000),
  ('Дневное шоу', '12:00-14:00', 12000),
  ('Вечернее шоу', '19:00-21:00', 20000)
ON CONFLICT DO NOTHING;

-- Create simple schedules for next 7 days
INSERT INTO show_schedule (show_id, scheduled_date, duration_minutes, ad_minutes, available_slots)
SELECT s.id, (current_date + gs.day)::date, 120, 30, 30
FROM shows s
CROSS JOIN LATERAL generate_series(0,6) AS gs(day)
ON CONFLICT DO NOTHING;


