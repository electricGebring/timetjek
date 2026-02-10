-- Migration: Upgrade work_entries table to new TimeRegistration structure
-- Note: All columns are now created in migration 001, so this migration only serves
-- as a marker for backwards compatibility.
-- Date: 2025-02-05

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_work_entries_employee_id
  ON work_entries (employee_id);

CREATE INDEX IF NOT EXISTS idx_work_entries_workplace_id
  ON work_entries (workplace_id);

CREATE INDEX IF NOT EXISTS idx_work_entries_check_in_at
  ON work_entries (check_in_at);

CREATE INDEX IF NOT EXISTS idx_work_entries_status
  ON work_entries (status);
