-- Migration: Fix services_feed unique constraint and add recurring shows support
-- Date: 2025-10-23
-- Description: 
--   1. Add unique constraint on services_feed.application_id for ON CONFLICT to work
--   2. Add is_recurring field to shows table for fixed daily shows

-- Step 1: Add unique constraint to services_feed.application_id
-- This fixes the error: "нет уникального ограничения или ограничения-исключения"
ALTER TABLE services_feed 
ADD CONSTRAINT services_feed_application_id_unique UNIQUE (application_id);

-- Step 2: Add is_recurring to shows table for daily recurring shows
ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Step 3: Add day_of_week for recurring shows (optional, for future weekly schedules)
-- NULL means daily, or could be 0-6 for specific day of week
ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS recurring_days TEXT; -- Could be 'daily', 'weekdays', 'weekends', or JSON array like '[1,3,5]'

-- Add comment
COMMENT ON COLUMN shows.is_recurring IS 'Если TRUE, это фиксированное шоу, которое идёт каждый день';
COMMENT ON COLUMN shows.recurring_days IS 'Дни повторения: daily, weekdays, weekends, или JSON массив [0-6] где 0=Воскресенье';

-- Add index for filtering recurring shows
CREATE INDEX IF NOT EXISTS idx_shows_is_recurring ON shows(is_recurring) WHERE is_recurring = TRUE;

-- Verify changes
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'shows' 
  AND column_name IN ('is_recurring', 'recurring_days')
ORDER BY ordinal_position;

-- Verify unique constraint was added
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'services_feed' 
  AND tc.constraint_type = 'UNIQUE';
