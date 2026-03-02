# Drizzle ORM Konfiguration

Drizzle är nu installerat och konfigurerat för ditt projekt!

## 📁 Nya filer

- **drizzle.config.ts** - Drizzle-konfiguration
- **src/db/schema.ts** - Din databassschema definition (type-safe)
- **src/db/drizzle.ts** - Hjälpfunktioner för att initiera Drizzle

## 🚀 Kommandon

```bash
# Generera migrations baserat på schema-ändringar
npm run db:generate

# Exekvera migrations
npm run db:migrate

# Push schema till databasen (utveckling)
npm run db:push

# Öppna Drizzle Studio (visuell databasklient)
npm run db:studio

# Radera alla tabeller
npm run db:drop
```

## 💡 Hur man använder Drizzle

### 1. Definera tabeller i schema.ts
```typescript
import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core'

export const workEntries = sqliteTable('work_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  // ... fler kolumner
})
```

### 2. Använd typer från schemat
```typescript
import { WorkEntry, NewWorkEntry } from '@/db/schema'

// Dessa är automatiskt genererade från schemat
type MyWorkEntry = WorkEntry
```

### 3. Gör SQL-queries med Drizzle (Web/Dev)
```typescript
import { getDb } from '@/db/drizzle'
import { workEntries } from '@/db/schema'
import { eq } from 'drizzle-orm'

const db = getDb()

// SELECT
const entries = await db.select().from(workEntries)

// INSERT
await db.insert(workEntries).values({
  name: 'Test',
  status: 'OPEN',
  // ...
})

// UPDATE
await db.update(workEntries)
  .set({ status: 'CLOSED' })
  .where(eq(workEntries.id, 1))

// DELETE
await db.delete(workEntries)
  .where(eq(workEntries.id, 1))
```

### 4. Hybrid-pattern för Capacitor Native
För native-appar: använd din befintliga Capacitor SQLite-kod men integrera Drizzle-typerna:

```typescript
import type { WorkEntry, NewWorkEntry } from '@/db/schema'
import { getDB } from './index'

// Fortsätt använda Capacitor SQLite API
export async function createWorkEntryNative(data: NewWorkEntry) {
  const db = getDB() as { execute: (sql: string, values?: unknown[]) => Promise<void> }
  
  // Typsäker data från Drizzle schema
  await db.execute(
    `INSERT INTO work_entries (name, status, ...) VALUES (?, ?, ...)`,
    [data.name, data.status, ...]
  )
}

// Men hämta typer från Drizzle
export async function getWorkDetailsNative(): Promise<WorkEntry[]> {
  const db = getDB() as { query: (sql: string) => Promise<{ values: unknown[][] }> }
  const result = await db.query(`SELECT * FROM work_entries WHERE deleted = 0`)
  
  // Din mapper omvandlar till WorkEntry (från Drizzle schema)
  return result.values.map(mapRowToWorkEntry)
}
```

## ⚠️ Viktigt att veta

### Capacitor SQLite Integration - Hybrid Approach ✅

Din setup använder **tre helt olika databaskontexter**:

| Miljö | Teknik | Runtime | Drizzle Support |
|-------|--------|---------|-----------------|
| **Lokal dev** | better-sqlite3 | Node.js | ✅ **Full** - Kan köra Drizzle-queries direkt |
| **Web (browser)** | sql.js | JavaScript VM | ⚠️ **Partiell** - Kör SQL men inte Drizzle ORM |
| **Native (iOS/Android)** | Capacitor SQLite | iOS/Android VM | ❌ **Ingen** - Körs helt separerat från Node.js |

**Rekommenderad strategi:**

```
┌─────────────────────────────────────┐
│   Drizzle Schema (src/db/schema.ts) │  ← Single Source of Truth
│   (TypeScript-first definition)     │
└─────────────────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │  npm run db:generate    │  Generera SQL-migrationer
    └─────────────────────────┘
         ↓          ↓          ↓
    Dev           Web         Native
  (Drizzle)   (Raw SQL)    (Raw SQL)
  directly     från SQL.js  från Capacitor
```

**Viktigt att förstå:**
- **Lokal dev**: Du kan skriva `await db.select()...` direktmot better-sqlite3 ✅
- **Web**: Du måste köra raw SQL (sql.js kan inte köra Drizzle-queries)
- **Native**: Du måste köra raw SQL (Capacitor SQLite kör på iOS/Android, inte Node.js)

**Arbetsgång:**

1. **Schema-ändringar**: Redigera bara `src/db/schema.ts` (gäller alla miljöer!)
2. **Generera migrations**: `npm run db:generate` → skapar SQL i `drizzle/`
3. **Lokal development**:
   - Använd Drizzle direkt: `await db.select().from(workEntries)`
   - better-sqlite3 förstår Drizzle-commands
4. **Web-versionen**:
   - Du kan inte använda Drizzle-queries direkt (sql.js körs i browser)
   - Lösning: Exportera Drizzle SQL-strängarna eller skriv raw SQL
5. **Native-versionen**:
   - Fortsätt med Capacitor SQLite API
   - Se de genererade SQL-filerna i `drizzle/` för schema
   - Körs på iOS/Android, tillgång bara till raw SQL

### ✨ Fördelar med denna hybrid-approach

- ✅ **Stabil**: Proven Capacitor SQLite på native
- ✅ **DRY**: Ett schema för alla plattformer
- ✅ **Flexibel**: Kan migrera senare utan risk
- ✅ **Type-safe**: Drizzle typer överallt
- ✅ **Ingen lock-in**: Inte beroende av experimentell kod
### 💡 Praktiska exempel för alla miljöer

**Lokal development (Node.js + better-sqlite3 + Drizzle):**
```typescript
import { getDb } from '@/db/drizzle'
import { workEntries } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ✅ Drizzle-queries fungerar direkt!
const entries = await getDb()
  .select()
  .from(workEntries)
  .where(eq(workEntries.deleted, 0))
```

**Web (Browser + sql.js):**
```typescript
import { sqlJsDb } from '@/db/index'

// ❌ Kan INTE köra Drizzle-queries
// ✅ Använd raw SQL istället:
const sql = `SELECT * FROM work_entries WHERE deleted = 0`
const result = sqlJsDb.exec(sql)
```

**Native (iOS/Android + Capacitor SQLite):**
```typescript
import { getDB } from '@/db/index'

// ❌ Kan INTE köra Drizzle-queries
// ✅ Använd Capacitor API:
const db = getDB() as { query: (sql: string) => Promise<any> }
const result = await db.query(`SELECT * FROM work_entries WHERE deleted = 0`)
```

**Men alla får typer från Drizzle:**
```typescript
import type { WorkEntry } from '@/db/schema'

// Detta fungerar överallt:
async function processEntries(): Promise<WorkEntry[]> {
  // Implementationen är annorlunda per miljö
  // Men returtypen är alltid samma!
}
```
### 🚀 Framtida migration

Om `@capawesome/capacitor-sqlite-drizzle` blir stabil:
1. Installera `npm install @capawesome/capacitor-sqlite-drizzle`
2. Byt native-queries från raw SQL till Drizzle (gradvis)
3. Samma schema, nya implementationer

### Migrering från gamla migrations
Dina befintliga SQL-migrations i `migrations/` kan behållas. Drizzle kommer att spara nya migrations i `drizzle/`-mappen.

## 📚 Öppna Drizzle Studio

Drizzle Studio är en visuell SQL-databasklient:
```bash
npm run db:studio
```
Denna öppnas automatiskt i webbläsaren och låter dig:
- Visa alla tabeller och data
- Köra SQL-queries
- Hantera databasstruktur
- Exportera/importera data

## 🔗 Dokumentation

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [SQLite-specifik dokumentation](https://orm.drizzle.team/docs/tutorials/sql-select)
- [Migrations](https://orm.drizzle.team/docs/migrations)

## 🎯 Nästa steg

1. **Granska schemat**: [src/db/schema.ts](../../src/db/schema.ts) - detta är ditt "källa till sanning"
2. **Testa Drizzle för web**: Börja använda Drizzle i dina web-komponenter med `getDb()`
3. **Generera migrationer**: `npm run db:generate` när du ändrar schema.ts
4. **Applicera på native**: 
   - Se de genererade SQL-filerna i `drizzle/`
   - Applicera via ditt befintliga Capacitor SQLite-system
5. **Gradvis migration**: Byt över queries från raw SQL till Drizzle när du uppdaterar services
6. **Monitoring**: Se `drizzle.examples.ts` för vanliga query-patterns
