CREATE TABLE IF NOT EXISTS work_entries (
  id INTEGER PRIMARY KEY,
  work_day_id INTEGER,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  personalNumber TEXT NOT NULL DEFAULT '',
  timeIn TEXT,
  timeOut TEXT,
  break INTEGER,
  workTime INTEGER,
  status INTEGER,
  statusType TEXT,
  hasError INTEGER NOT NULL DEFAULT 0,
  updatedBy TEXT,
  updatedAt TEXT,
  createdAt TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_work_entries_synced_deleted
  ON work_entries (synced, deleted);

CREATE INDEX IF NOT EXISTS idx_work_entries_work_day_id
  ON work_entries (work_day_id);
