-- Fix notifications table - add missing read_at column if not exists
-- Run this if you get error: column "read_at" does not exist

-- Add read_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read';
  END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
