-- Migration: Add commercial_id to application tables
-- Date: 2025-10-24
-- Description: Add commercial_id field to track which commercial user took the application

-- Add commercial_id to main applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id);

-- Add commercial_id to pending_applications table
ALTER TABLE pending_applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id);

-- Add commercial_id to approved_applications table
ALTER TABLE approved_applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id);

-- Add commercial_id to rejected_applications table
ALTER TABLE rejected_applications 
ADD COLUMN IF NOT EXISTS commercial_id UUID REFERENCES users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_commercial_id ON applications(commercial_id);
CREATE INDEX IF NOT EXISTS idx_pending_applications_commercial_id ON pending_applications(commercial_id);
CREATE INDEX IF NOT EXISTS idx_approved_applications_commercial_id ON approved_applications(commercial_id);
CREATE INDEX IF NOT EXISTS idx_rejected_applications_commercial_id ON rejected_applications(commercial_id);

-- Done
