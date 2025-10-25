-- Migration: Fix contracts foreign key constraint
-- Date: 2025-10-25
-- Description: Remove foreign key constraint on application_id to allow contracts for applications in any table

BEGIN;

-- Drop the foreign key constraint
ALTER TABLE contracts 
DROP CONSTRAINT IF EXISTS contracts_application_id_fkey;

-- Add a check to ensure application_id is not null (keep data integrity)
ALTER TABLE contracts 
ALTER COLUMN application_id SET NOT NULL;

-- Add comment explaining the design decision
COMMENT ON COLUMN contracts.application_id IS 'References application ID from any of the application tables (applications, pending_applications, approved_applications, rejected_applications). No FK constraint to allow flexibility.';

COMMIT;

-- Verification
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'contracts'::regclass
  AND contype = 'f';
