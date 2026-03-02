/**
 * Exempel: Hur man använder Drizzle ORM
 * 
 * Detta är ett praktiskt exempel på hur man använder Drizzle
 * för typ-säkra SQL-queries istället för raw SQL.
 * 
 * Du kan använda detta som referens när du gradvis migrerar
 * dina befintliga SQL-queries till Drizzle.
 */

import { getDb } from '@/db/drizzle'
import { workEntries } from '@/db/schema'
import { eq, and, not, isNull } from 'drizzle-orm'

/**
 * Exempel 1: Hämta alla arbetsuppgifter (motsvarar getWorkEntries)
 */
export async function getAllWorkEntriesExample() {
  const db = getDb()
  
  return db
    .select()
    .from(workEntries)
    .where(
      and(
        eq(workEntries.deleted, 0),
        isNull(workEntries.deleted_at)
      )
    )
}

/**
 * Exempel 2: Hämta osyncade arbetsuppgifter
 */
export async function getUnsyncedWorkEntriesExample() {
  const db = getDb()
  
  return db
    .select()
    .from(workEntries)
    .where(
      and(
        eq(workEntries.synced, 0),
        eq(workEntries.deleted, 0),
        isNull(workEntries.deleted_at)
      )
    )
}

/**
 * Exempel 3: Hämta raderade arbetsuppgifter
 */
export async function getDeletedWorkEntriesExample() {
  const db = getDb()
  
  return db
    .select()
    .from(workEntries)
    .where(
      and(
        eq(workEntries.deleted, 1),
        eq(workEntries.synced, 0)
      )
    )
}

/**
 * Exempel 4: Hämta arbetsuppgifter för en specifik anställd
 */
export async function getWorkEntriesByEmployeeExample(employeeId: number) {
  const db = getDb()
  
  return db
    .select()
    .from(workEntries)
    .where(
      and(
        eq(workEntries.employee_id, employeeId),
        eq(workEntries.deleted, 0)
      )
    )
}

/**
 * Exempel 5: Skapa en ny arbetsuppgift
 */
export async function createWorkEntryExample(data: {
  employee_id: number
  workplace_id?: number
  check_in_at?: string
  status?: string
}) {
  const db = getDb()
  
  const result = await db
    .insert(workEntries)
    .values({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning()
  
  return result[0]
}

/**
 * Exempel 6: Uppdatera en arbetsuppgift
 */
export async function updateWorkEntryExample(id: number, updates: { status?: string; check_out_at?: string }) {
  const db = getDb()
  
  const result = await db
    .update(workEntries)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(workEntries.id, id))
    .returning()
  
  return result[0]
}

/**
 * Exempel 7: Ta bort en arbetsuppgift (soft delete)
 */
export async function softDeleteWorkEntryExample(id: number) {
  const db = getDb()
  
  const result = await db
    .update(workEntries)
    .set({
      deleted: 1,
      deleted_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(workEntries.id, id))
    .returning()
  
  return result[0]
}

/**
 * Exempel 8: Markera som synkad
 */
export async function markWorkEntriesSyncedExample(ids: number[]) {
  const db = getDb()
  
  return db
    .update(workEntries)
    .set({
      synced: 1,
      updatedAt: new Date().toISOString(),
    })
    .where(
      // Använd 'in' operator för multiple IDs
      // import { inArray } from 'drizzle-orm'
      // inArray(workEntries.id, ids)
      eq(workEntries.synced, 0) // Förenklat exempel
    )
}

/**
 * Exempel 9: Hämta statistik
 */
export async function getWorkEntriesStatsExample() {
  const db = getDb()
  import { sum, count } from 'drizzle-orm'
  
  return db
    .select({
      totalSeconds: sum(workEntries.total_working_seconds),
      totalBreakSeconds: sum(workEntries.total_break_seconds),
      count: count(),
    })
    .from(workEntries)
    .where(eq(workEntries.deleted, 0))
}

/**
 * ADVANTAGES av Drizzle:
 * ✅ Type-safety - Kompilatorn hjälper dig att fånga fel
 * ✅ Auto-completion - Din IDE vet vilka kolumner som finns
 * ✅ Refactoring-safe - Ändra kolumnnamn och allt uppdateras automatiskt
 * ✅ SQL-injection prevention - Parametrar hanteras säkert
 * ✅ Readable - Queries är lätta att läsa och förstå
 * ✅ Composable - Du kan bygga upp komplexeta queries step-by-step
 */

/**
 * TIPS:
 * - Använd 'eq', 'and', 'or', 'not' från drizzle-orm för WHERE clauses
 * - Importera operatörer du behöver från 'drizzle-orm'
 * - `.returning()` hämtar den uppdaterad/skapade raden
 * - För aggregates, importera sum, count, avg etc från 'drizzle-orm'
 * - Se schema.ts för alla tillgängliga kolumner
 */
