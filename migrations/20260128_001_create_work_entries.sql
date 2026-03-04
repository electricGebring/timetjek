CREATE TABLE IF NOT EXISTS work_entries (
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
  hasError INTEGER DEFAULT 0,
  updatedBy TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  deleted_at TEXT,
  synced INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_work_entries_synced_deleted
  ON work_entries (synced, deleted);

CREATE INDEX IF NOT EXISTS idx_work_entries_work_day_id
  ON work_entries (work_day_id);

CREATE INDEX IF NOT EXISTS idx_work_entries_remote_id
  ON work_entries (remote_id);
