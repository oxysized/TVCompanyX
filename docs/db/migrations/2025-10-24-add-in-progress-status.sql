-- Migration: Add 'in_progress' status to application_status enum
-- Date: 2025-10-24
-- Description: Add new status 'in_progress' for when agent is working with customer

-- Add new value to enum type
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'in_progress';

-- Update existing applications that have agent assigned but status is 'sent_to_commercial'
-- These should be 'in_progress' (agent working with customer)
-- Only update if there's no commercial involvement yet (this can be determined by checking if commercial has interacted)
-- For now, we'll leave existing data as is, and new applications will use the correct flow

-- Note: The application flow is now:
-- 1. pending - Customer submitted, waiting for agent
-- 2. in_progress - Agent accepted and working with customer
-- 3. sent_to_commercial - Agent sent to commercial department for approval
-- 4. approved/rejected - Commercial department decision
-- 5. paid/overdue - Payment statuses
