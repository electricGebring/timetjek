export const STAFF_REGISTER_SCHEMA = `
  CREATE TABLE IF NOT EXISTS work_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    dateLabel TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS work_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_day_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    personalNumber TEXT,
    timeIn TEXT,
    timeOut TEXT,
    break TEXT,
    workTime TEXT,
    status TEXT,
    statusType TEXT,
    hasError INTEGER DEFAULT 0,
    updatedBy TEXT,
    updatedAt TEXT,
    createdAt TEXT,
      notes TEXT, -- Ny kolumn tillagd i grundschemat (för nya installationer)
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
    FOREIGN KEY (work_day_id) REFERENCES work_days(id)
  );

  CREATE TABLE IF NOT EXISTS work_scheme_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headerDate TEXT,
    headerTime TEXT,
    dateRange TEXT,
    company TEXT,
    workplace TEXT,
    totalWorkTime TEXT
  );
`;

// Migration för befintliga databaser (lägg till notes-kolumnen om den saknas)
export const STAFF_REGISTER_MIGRATIONS: string[] = [
  'ALTER TABLE work_entries ADD COLUMN notes TEXT'
];
export const WORK_SCHEME_SCHEMA = `
  CREATE TABLE IF NOT EXISTS work_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    dateLabel TEXT NOT NULL,
    synced INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS work_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_day_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    personalNumber TEXT,
    timeIn TEXT,
    timeOut TEXT,
    break TEXT,
    workTime TEXT,
    status TEXT,
    statusType TEXT,
    hasError INTEGER DEFAULT 0,
    updatedBy TEXT,
    updatedAt TEXT,
    synced INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    FOREIGN KEY (work_day_id) REFERENCES work_days(id)
  );

  CREATE TABLE IF NOT EXISTS work_scheme_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headerDate TEXT,
    headerTime TEXT,
    dateRange TEXT,
    company TEXT,
    workplace TEXT,
    totalWorkTime TEXT
  );
`

export const WORK_SCHEME_MIGRATIONS: string[] = []