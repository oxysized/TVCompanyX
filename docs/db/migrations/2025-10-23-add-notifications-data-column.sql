-- Add missing data column to notifications table
-- This column stores additional JSON data for each notification

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data JSONB;
    COMMENT ON COLUMN notifications.data IS 'Additional JSON data specific to notification type (application_id, message_id, etc.)';
  END IF;
END $$;

-- Verify all required columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
