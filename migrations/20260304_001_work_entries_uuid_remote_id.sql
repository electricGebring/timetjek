-- Migrate work_entries.id from INTEGER to TEXT UUID-compatible key
-- and add remote_id for backend identifier mapping.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS work_entries_uuid_tmp (
  id TEXT PRIMARY KEY,
  remote_id TEXT,
  employee_id INTEGER,
  workplace_id INTEGER,
  cost_center_id INTEGER,
  work_day_id INTEGER,
  status TEXT DEFAULT 'OPEN',
  check_in_at TEXT,
  check_in_time_at TEXT,
  check_in_latitude REAL,
  check_in_longitude REAL,
  check_in_application TEXT DEFAULT 'APP',
  check_out_at TEXT,
  check_out_time_at TEXT,
  check_out_latitude REAL,
  check_out_longitude REAL,
  check_out_application TEXT,
  break TEXT,
  meal_benefit_has_breakfast INTEGER DEFAULT 0,
  meal_benefit_has_lunch INTEGER DEFAULT 0,
  name TEXT,
  type TEXT,
  personalNumber TEXT,
  administrator_comment TEXT,
  total_working_seconds INTEGER,
  total_break_seconds INTEGER,
  hasError INTEGER DEFAULT 0,
  updatedBy TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  deleted_at TEXT,
  synced INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0
);

INSERT INTO work_entries_uuid_tmp (
  id,
  remote_id,
  employee_id,
  workplace_id,
  cost_center_id,
  work_day_id,
  status,
  check_in_at,
  check_in_time_at,
  check_in_latitude,
  check_in_longitude,
  check_in_application,
  check_out_at,
  check_out_time_at,
  check_out_latitude,
  check_out_longitude,
  check_out_application,
  break,
  meal_benefit_has_breakfast,
  meal_benefit_has_lunch,
  name,
  type,
  personalNumber,
  administrator_comment,
  total_working_seconds,
  total_break_seconds,
  hasError,
  updatedBy,
  createdAt,
  updatedAt,
  deleted_at,
  synced,
  deleted
)
SELECT
  CASE
    WHEN id IS NULL OR TRIM(CAST(id AS TEXT)) = '' THEN 'legacy-' || lower(hex(randomblob(16)))
    ELSE CAST(id AS TEXT)
  END,
  NULL,
  employee_id,
  workplace_id,
  cost_center_id,
  work_day_id,
  status,
  check_in_at,
  check_in_time_at,
  check_in_latitude,
  check_in_longitude,
  check_in_application,
  check_out_at,
  check_out_time_at,
  check_out_latitude,
  check_out_longitude,
  check_out_application,
  break,
  meal_benefit_has_breakfast,
  meal_benefit_has_lunch,
  name,
  type,
  personalNumber,
  administrator_comment,
  total_working_seconds,
  total_break_seconds,
  hasError,
  updatedBy,
  createdAt,
  updatedAt,
  deleted_at,
  synced,
  deleted
FROM work_entries;

DROP TABLE work_entries;
ALTER TABLE work_entries_uuid_tmp RENAME TO work_entries;

CREATE INDEX IF NOT EXISTS idx_work_entries_synced_deleted
  ON work_entries (synced, deleted);
CREATE INDEX IF NOT EXISTS idx_work_entries_work_day_id
  ON work_entries (work_day_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_employee_id
  ON work_entries (employee_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_workplace_id
  ON work_entries (workplace_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_check_in_at
  ON work_entries (check_in_at);
CREATE INDEX IF NOT EXISTS idx_work_entries_status
  ON work_entries (status);
CREATE INDEX IF NOT EXISTS idx_work_entries_remote_id
  ON work_entries (remote_id);

PRAGMA foreign_keys = ON;
