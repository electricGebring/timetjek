-- Migration: Upgrade work_entries table to new TimeRegistration structure
-- Note: All columns are now created in migration 001, so this migration only serves
-- as a marker for backwards compatibility. ALTER statements removed as they would fail
-- when columns already exist.
-- Date: 2025-02-05

-- Data migration: Convert old time fields to new format (if any old data exists)
-- This is a simplified migration; adjust based on actual data
UPDATE work_entries 
SET 
  check_in_at = datetime(createdAt, 'start of day', '+' || 
    CAST(
      CAST(substr(check_in_time_at, 1, 2) AS INTEGER) * 3600 + 
      CAST(substr(check_in_time_at, 4, 2) AS INTEGER) * 60 + 
      CAST(substr(check_in_time_at, 7, 2) AS INTEGER) 
    AS TEXT) || ' seconds'),
  check_in_latitude = 59.3293,
  check_in_longitude = 18.0686
WHERE check_in_time_at IS NOT NULL AND check_in_at IS NULL;

UPDATE work_entries 
SET 
  check_out_at = datetime(createdAt, 'start of day', '+' || 
    CAST(
      CAST(substr(check_out_time_at, 1, 2) AS INTEGER) * 3600 + 
      CAST(substr(check_out_time_at, 4, 2) AS INTEGER) * 60 + 
      CAST(substr(check_out_time_at, 7, 2) AS INTEGER) 
    AS TEXT) || ' seconds'),
  check_out_latitude = 59.3293,
  check_out_longitude = 18.0686
WHERE check_out_time_at IS NOT NULL AND check_out_at IS NULL;

-- Map old status values to new enum values
UPDATE work_entries 
SET status = 'CLOSED' 
WHERE status IS NOT NULL AND statusType = 'normal';

UPDATE work_entries 
SET status = 'OPEN' 
WHERE status IS NOT NULL AND statusType IN ('working', 'break');

UPDATE work_entries 
SET status = CASE 
  WHEN check_out_at IS NOT NULL THEN 'CLOSED'
  ELSE 'OPEN'
END
WHERE status IS NULL;

-- Add index for new columns
CREATE INDEX IF NOT EXISTS idx_work_entries_employee_id
  ON work_entries (employee_id);

CREATE INDEX IF NOT EXISTS idx_work_entries_workplace_id
  ON work_entries (workplace_id);

CREATE INDEX IF NOT EXISTS idx_work_entries_check_in_at
  ON work_entries (check_in_at);

CREATE INDEX IF NOT EXISTS idx_work_entries_status
  ON work_entries (status);
