-- Safe migration: backup users and optionally drop legacy `name` column
-- Author: automated assistant
-- Date: 2025-10-22
-- IMPORTANT: Make a full database backup before running any destructive commands.
-- This migration creates backup copies of the users table, verifies that first_name/last_name exist,
-- and only drops `name` column if a safety check passes. It also includes commented commands for
-- optional scrubbing of sensitive fields (destructive) if desired and confirmed.

BEGIN;

-- 0) Ensure we have the new columns (this should be redundant if previous migration was applied)
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS middle_name text;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_name text;

-- 1) Create a full backup of users table (schema + data) with timestamp
CREATE TABLE IF NOT EXISTS users_backup_by_migration_2025_10_22 AS
SELECT *, now() as backup_taken_at FROM users;

-- 2) Create a lightweight report of missing name parts
CREATE TEMP TABLE users_missing_name AS
SELECT id, name, first_name, middle_name, last_name FROM users
WHERE (first_name IS NULL OR last_name IS NULL) OR (COALESCE(trim(first_name), '') = '' OR COALESCE(trim(last_name), '') = '');

-- 3) Count missing rows to decide whether to drop `name`
-- Run this query manually after applying migration to check counts before proceeding
-- SELECT COUNT(*) as missing_count FROM users_missing_name;

-- 4) If there are 0 rows in users_missing_name, it is safe to drop the legacy `name` column.
-- For safety, we do NOT drop it automatically in this migration. Uncomment and run manually after review.
-- ALTER TABLE users DROP COLUMN IF EXISTS name;

-- 5) OPTIONAL: If you need to scrub sensitive fields (destructive), review and uncomment carefully.
-- WARNING: These commands are irreversible unless you have the backup table created above.
-- To anonymize bank_details and phone for all users:
-- UPDATE users SET bank_details = NULL, phone = NULL, updated_at = now();

-- To remove password hashes for all users (force password reset):
-- UPDATE users SET password_hash = NULL, updated_at = now();

COMMIT;

-- After review, you can inspect users_missing_name table to see problematic rows and decide on remediation.
-- Example to list problematic users:
-- SELECT * FROM users_missing_name LIMIT 100;

-- If everything looks good and you want to drop the legacy column, run (manually after verification):
-- ALTER TABLE users DROP COLUMN IF EXISTS name;
