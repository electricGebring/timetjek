-- Migrate work_entry_breaks.id from INTEGER AUTOINCREMENT to TEXT (UUID)
PRAGMA foreign_keys = OFF;

CREATE TABLE work_entry_breaks_new (
  id TEXT PRIMARY KEY NOT NULL,
  work_entry_id TEXT NOT NULL,
  start_at TEXT,
  end_at TEXT,
  start_exact_at TEXT,
  end_exact_at TEXT,
  created_at TEXT NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
  FOREIGN KEY (work_entry_id) REFERENCES work_entries(id) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO work_entry_breaks_new (id, work_entry_id, start_at, end_at, start_exact_at, end_exact_at, created_at)
SELECT
  'migrated-' || lower(hex(randomblob(16))),
  work_entry_id,
  start_at,
  end_at,
  start_exact_at,
  end_exact_at,
  created_at
FROM work_entry_breaks;

DROP TABLE work_entry_breaks;

ALTER TABLE work_entry_breaks_new RENAME TO work_entry_breaks;

CREATE INDEX IF NOT EXISTS idx_work_entry_breaks_work_entry_id ON work_entry_breaks (work_entry_id);

PRAGMA foreign_keys = ON;
