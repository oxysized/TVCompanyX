-- Add show_type column and description to shows table
-- This allows categorizing shows (series, morning, evening, news, etc.)

DO $$ 
BEGIN
  -- Add show_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'show_type'
  ) THEN
    ALTER TABLE shows ADD COLUMN show_type VARCHAR(50) DEFAULT 'program';
    COMMENT ON COLUMN shows.show_type IS 'Type of show: series, morning, day, evening, news, entertainment, sport, documentary, children, movie, program';
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'description'
  ) THEN
    ALTER TABLE shows ADD COLUMN description TEXT;
    COMMENT ON COLUMN shows.description IS 'Description of the show';
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE shows ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN shows.is_active IS 'Whether the show is active and available for ad placement';
  END IF;

  -- Add duration_minutes column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shows' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE shows ADD COLUMN duration_minutes INTEGER DEFAULT 60;
    COMMENT ON COLUMN shows.duration_minutes IS 'Duration of the show in minutes';
  END IF;
END $$;

-- Create index on show_type for filtering
CREATE INDEX IF NOT EXISTS idx_shows_type ON shows(show_type);

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'shows' 
ORDER BY ordinal_position;
