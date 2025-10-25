-- Migration: Add commercial_id field to all application tables
-- Date: 2025-10-25
-- Description: Add commercial_id column to track which commercial department user is handling the application

BEGIN;

-- Add commercial_id to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add commercial_id to pending_applications table
ALTER TABLE pending_applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add commercial_id to approved_applications table
ALTER TABLE approved_applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add commercial_id to rejected_applications table
ALTER TABLE rejected_applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_commercial_id ON applications(commercial_id);
CREATE INDEX IF NOT EXISTS idx_pending_applications_commercial_id ON pending_applications(commercial_id);
CREATE INDEX IF NOT EXISTS idx_approved_applications_commercial_id ON approved_applications(commercial_id);
CREATE INDEX IF NOT EXISTS idx_rejected_applications_commercial_id ON rejected_applications(commercial_id);

COMMIT;

-- Verify the changes
SELECT 
    'applications' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('applications', 'pending_applications', 'approved_applications', 'rejected_applications')
  AND column_name = 'commercial_id'
ORDER BY table_name;
