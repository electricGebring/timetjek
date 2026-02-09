# SQLite Schema Reference

**Syftet:** Tydlig dokumentation av timetjek-databasens schema, struktur och migrations.

---

## Tabellöversikt

| Tabell | Syfte | Typ |
|--------|-------|-----|
| `work_entries` | Lagrar stämplingar (in/ut/rast) | Data |
| `outbox` | Kö för operationer som väntar på synk | System |

---

## Tabell: `work_entries`

**Syfte:** Lagra tidsregistreringsdata för anställda (in-stämplar, ut-stämplar, raster).

### Kolumner

#### Identifikatorer
| Kolumn | Typ | Constraint | Beskrivning |
|--------|-----|-----------|------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unik identifikator, auto-genererad |
| `employee_id` | INTEGER | | ID på anställd |
| `workplace_id` | INTEGER | | Arbetsplats-ID |
| `cost_center_id` | INTEGER | NULLABLE | Kostnadsställes-ID |
| `work_day_id` | INTEGER | FK → work_days.id | Arbetsdag-ID |

#### Status
| Kolumn | Typ | Default | Beskrivning |
|--------|-----|---------|------------|
| `status` | TEXT | 'OPEN' | Status: OPEN \| CLOSED \| FORGOT_CHECK_OUT \| AWAITS_APPROVAL |
| `synced` | INTEGER | 0 | Sync-status: 0=ej synkad, 1=synkad ✓ |
| `deleted` | INTEGER | 0 | Soft-delete flagga: 0=aktiv, 1=markerad för borttagning |
| `deleted_at` | TEXT | NULL | ISO 8601 timestamp när den markerades för borttagning |

#### In-stämpel
| Kolumn | Typ | Default | Beskrivning |
|--------|-----|---------|------------|
| `check_in_at` | TEXT | NULL | ISO 8601 datetime för in-stämpel |
| `check_in_time_at` | TEXT | NULL | HH:MM:SS tidsformat (legacy) |
| `check_in_latitude` | REAL | NULL | GPS-latitud vid in-stämpel |
| `check_in_longitude` | REAL | NULL | GPS-longitud vid in-stämpel |
| `check_in_application` | TEXT | 'APP' | Applikation/enhet: 'APP', 'WEB', 'TERMINAL' |

#### Ut-stämpel
| Kolumn | Typ | Default | Beskrivning |
|--------|-----|---------|------------|
| `check_out_at` | TEXT | NULL | ISO 8601 datetime för ut-stämpel |
| `check_out_time_at` | TEXT | NULL | HH:MM:SS tidsformat (legacy) |
| `check_out_latitude` | REAL | NULL | GPS-latitud vid ut-stämpel |
| `check_out_longitude` | REAL | NULL | GPS-longitud vid ut-stämpel |
| `check_out_application` | TEXT | NULL | Applikation/enhet vid ut-stämpel |

#### Rast
| Kolumn | Typ | Default | Beskrivning |
|--------|-----|---------|------------|
| `break` | TEXT | NULL | Format: "HH:MM:SS-HH:MM:SS" (start-slut) eller "HH:MM:SS-00:00:00" (pågår) |
| `total_break_seconds` | INTEGER | NULL | Total rastduration i sekunder |

#### Arbetstid
| Kolumn | Typ | Default | Beskrivning |
|--------|-----|---------|------------|
| `total_working_seconds` | INTEGER | NULL | Total arbetstid i sekunder |

#### Personuppgifter
| Kolumn | Typ | Default | Beskrivning |
|--------|-----|---------|------------|
| `name` | TEXT | NULL | Anställds namn |
| `type` | TEXT | NULL | Anställningstyp: 'A' (Anställd), 'P' (Praktikant), 'K' (Konsult), 'V' (Volontär) |
| `personalNumber` | TEXT | NULL | Personnummer/ID-nummer |

#### Övriga
| Kolumn | Typ | Default | Beskrivning |
|--------|-----|---------|------------|
| `administrator_comment` | TEXT | NULL | Kommentar från administratör |
| `hasError` | INTEGER | 0 | Felmarkering: 0=ok, 1=fel |
| `updatedBy` | TEXT | NULL | Vem som uppdaterade posten |
| `createdAt` | TEXT | NULL | ISO 8601 timestamp för skapande |
| `updatedAt` | TEXT | NULL | ISO 8601 timestamp för senaste uppdatering |

### Index

```sql
CREATE INDEX idx_work_entries_synced_deleted 
  ON work_entries (synced, deleted);

CREATE INDEX idx_work_entries_work_day_id 
  ON work_entries (work_day_id);

CREATE INDEX idx_work_entries_employee_id 
  ON work_entries (employee_id);

CREATE INDEX idx_work_entries_workplace_id 
  ON work_entries (workplace_id);

CREATE INDEX idx_work_entries_check_in_at 
  ON work_entries (check_in_at);

CREATE INDEX idx_work_entries_status 
  ON work_entries (status);
```

**Syfte:** Snabb filtrering på sync-status, arbetsdagar, anställda och tidspunkter.

---

## Tabell: `outbox`

**Syfte:** Lokalt lagra operationer som väntar på att synkas till servern (offline-first pattern).

### Kolumner

| Kolumn | Typ | Constraint | Beskrivning |
|--------|-----|-----------|------------|
| `id` | INTEGER | PRIMARY KEY | Unik identifikator |
| `type` | TEXT | NOT NULL | Operationstyp: 'INSERT', 'UPDATE', 'DELETE' |
| `payload` | TEXT | NOT NULL | JSON-sträng med hela dataraden |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp när operationen köades |

### Index

```sql
CREATE INDEX idx_outbox_type ON outbox (type);
```

**Syfte:** Snabb sökning efter operationstyp vid tömning av kö.

### Workflow

```
1. Lokal mutation skapar row i work_entries med synced=0
2. SAMTIDIGT: Insätt entry i outbox med JSON-payload
3. triggerSync() aktiveras
4. SyncEngine dränerar outbox:
   - Skicka payload till API
   - Om framgång: sätt work_entries.synced=1
   - Om misslyckad: behålls i outbox, retry nästa sync
5. Outbox-row tas bort när synk lyckades
```

---

## Migrations

Alla migrations ligger i `/migrations/` och körs i ID-ordning.

### Migration 001: `20260128_001_create_work_entries.sql`
- **Datum:** 2026-01-28
- **Beskrivning:** Skapar `work_entries`-tabellen med alla kolumner
- **Tabeller:** work_entries
- **Index:** 2 stycken (synced_deleted, work_day_id)

### Migration 002: `20260201_001_add_outbox.sql`
- **Datum:** 2026-02-01
- **Beskrivning:** Skapar `outbox`-tabellen för offline-synk-kö
- **Tabeller:** outbox
- **Index:** 1 stycke (outbox_type)

### Migration 003: `20260205_001_add_total_break_seconds.sql`
- **Datum:** 2026-02-05
- **Beskrivning:** Lägger till `total_break_seconds`-kolumn för rastmätning
- **Tabeller:** work_entries
- **Ny kolumn:** `total_break_seconds INTEGER`

### Migration 004: `20260205_002_upgrade_work_entries.sql`
- **Datum:** 2026-02-05
- **Beskrivning:** Data-migration för att konvertera gamla tidsformat, mappning av status
- **Data-transformationer:**
  - `check_in_time_at` (HH:MM:SS) → `check_in_at` (ISO datetime)
  - `check_out_time_at` (HH:MM:SS) → `check_out_at` (ISO datetime)
  - Gamla status-värden → nya enum-värden (OPEN, CLOSED, etc)
  - Sätt in GPS-koordinater (Stockholm-standardkoordinater vid konvertering)
- **Nya index:** employee_id, workplace_id, check_in_at, status

---

## Data Flow: In-stämpel → Synk → Server

```
┌─────────────────────────────────────┐
│ 1. UI: handleCheckIn()              │
└─────────────────────┬───────────────┘
                      ↓
┌─────────────────────────────────────┐
│ 2. Store: store.checkIn(work_day_id)│
└─────────────────────┬───────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 3. Domain: createWorkEntry()                │
│    - Validering (affärsregler)              │
│    - Sätt: synced=0, status=OPEN            │
└─────────────────────┬───────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 4a. DB: upsertWorkEntry() → work_entries    │
│     INSERT with synced=0                    │
├─────────────────────┬───────────────────────┤
│ 4b. DB: insertOutbox() → outbox             │
│     INSERT payload JSON                     │
└─────────────────────┬───────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 5. triggerSyncIfOnline()                    │
│    (debounced, väntar online-signal)        │
└─────────────────────┬───────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 6. SyncEngine: sync()                       │
│    a) drainOutbox()                         │
│    b) drainDeletions()                      │
│    c) pullRemoteChanges()                   │
└─────────────────────┬───────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 7. drainOutbox()                            │
│    Läs outbox-row, skicka payload till API  │
│    POST /entries eller PATCH /entries/{id}  │
└─────────────────────┬───────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│ 8. API svarar: { id, ..., synced: 1 }      │
│    Uppdatera work_entries.synced=1          │
│    Ta bort outbox-row                       │
└─────────────────────┬───────────────────────┘
                      ↓
         ✓ Entry synkad till server
```

---

## Query-exempel

### Hämta alla osyncade entries
```sql
SELECT * FROM work_entries 
WHERE synced = 0 AND deleted = 0;
```

### Hämta entries för idag
```sql
SELECT * FROM work_entries 
WHERE DATE(check_in_at) = DATE('now')
ORDER BY check_in_at DESC;
```

### Hämta entries som väntar på synk
```sql
SELECT 
  we.id, 
  we.name, 
  we.check_in_at,
  ob.payload
FROM work_entries we
LEFT JOIN outbox ob ON ob.payload LIKE '%"' || we.id || '"%'
WHERE we.synced = 0
ORDER BY we.createdAt DESC;
```

### Permanent delete efter synk (två steg)
```sql
-- Steg 1: Soft delete (markera för borttagning)
UPDATE work_entries 
SET deleted_at = datetime('now'), synced = 0 
WHERE id = 42;

-- Steg 2: Efter API delete-anrop lyckas → permanent delete
DELETE FROM work_entries WHERE id = 42 AND deleted_at IS NOT NULL;
```

### Rensa soft-deleted entries (auto-cleanup)
```sql
-- Ta bort entries märkta för borttagning för > 30 dagar sedan
DELETE FROM work_entries 
WHERE deleted_at IS NOT NULL 
  AND datetime(deleted_at) < datetime('now', '-30 days');
```

---

## Typval och Enum-värden

### `status` (TimeRegistrationStatus)
```typescript
enum TimeRegistrationStatus {
  OPEN = 'OPEN',                    // Användar är instämplad, arbetar
  CLOSED = 'CLOSED',                // Användare är utstämplad, dag slutförd
  FORGOT_CHECK_OUT = 'FORGOT_CHECK_OUT',  // Glömt att stämpla ut
  AWAITS_APPROVAL = 'AWAITS_APPROVAL'     // Inväntar godkännande
}
```

### `type` (Anställningstyp)
```
'A' = Anställd
'P' = Praktikant
'K' = Konsult
'V' = Volontär
```

### `check_in_application` / `check_out_application`
```
'APP'      = Mobil app
'WEB'      = Web-applikation
'TERMINAL' = Tidsregistreringsterminal
```

---

## Performance & Rekommendationer

### Index-strategi
- ✅ `synced, deleted` — Först vid drainOutbox och cleanup
- ✅ `work_day_id` — Via FK, snabb gruppering per dag
- ✅ `employee_id`, `workplace_id` — Filtrering per anställd/plats
- ✅ `check_in_at` — Tidsbaserad sökning
- ✅ `status` — Statusfiltrering

### Retention-policy
Se `/src/domain/config/data-policies.ts`:
```typescript
workEntries: {
  retentionDays: 365,        // Spara i 1 år
  conflictStrategy: 'LAST_WRITE_WINS'
}
```

### Batch-gränser
- Sync-batch: max 20 entries per API-anrop
- Deletion-batch: max 10 entries per deletion-anrop

---

## Relaterad dokumentation
- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — Systemöversikt
- [OFFLINE_FIRST.md](OFFLINE_FIRST.md) — Offline-first-strategi

---

**Senast uppdaterad:** 2026-02-09
**Schema version:** 004 (efter alla migrations)
