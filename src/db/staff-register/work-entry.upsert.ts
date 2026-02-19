import { getDB } from '../index'

import { Capacitor } from '@capacitor/core'

import type { WorkEntry } from '@/models/work-entry.schema'

import { buildSafeWorkEntry, type SafeWorkEntry } from './work-entry.helpers'

import { bindUpdate, bindInsertWithId, bindInsertAutoId } from './work-entry.bind'

import { WORK_ENTRY_SQL } from './work-entry.sql'

const SQL = WORK_ENTRY_SQL

async function upsertWorkEntryNative(safeEntry: SafeWorkEntry) {
  const db = getDB()

  let rowExists = false

  if (safeEntry.id !== null && safeEntry.id !== undefined) {
    const res = await db.query(SQL.SELECT_ID, [safeEntry.id])

    rowExists = !!(res.values && res.values.length)
  }

  if (rowExists) {
    await db.run(SQL.UPDATE_FULL, bindUpdate(safeEntry))
  }
 else {
    if (safeEntry.id !== null && safeEntry.id !== undefined) {
      await db.run(SQL.INSERT_WITH_ID, bindInsertWithId(safeEntry))
    }
 else {
      await db.run(SQL.INSERT_AUTO_ID, bindInsertAutoId(safeEntry))
    }
  }
}

function upsertWorkEntryWeb(safeEntry: SafeWorkEntry) {
  const { sqlJsDb, saveDatabase } = getDB() as {
    sqlJsDb: {
      exec: (sql: string, params: unknown[]) => { length: number; values: unknown[] }[]
      run: (sql: string, params: unknown[]) => void
    }
    saveDatabase: () => void
  }

  let rowExists = false

  if (safeEntry.id !== null) {
    if (safeEntry.id !== null && safeEntry.id !== undefined) {
      const results = sqlJsDb.exec(SQL.SELECT_ID, [safeEntry.id])

      rowExists = results.length > 0 && results[0].values.length > 0
    }
  }

  if (rowExists) {
    sqlJsDb.run(SQL.UPDATE_FULL, bindUpdate(safeEntry))
  }
 else {
    if (safeEntry.id !== null && safeEntry.id !== undefined) {
      sqlJsDb.run(SQL.INSERT_WITH_ID, bindInsertWithId(safeEntry))
    }
 else {
      sqlJsDb.run(SQL.INSERT_AUTO_ID, bindInsertAutoId(safeEntry))
    }
  }

  saveDatabase()
}

export async function upsertWorkEntry(entry: Partial<WorkEntry> | SafeWorkEntry) {
  const safeEntry =
    typeof entry.meal_benefit_has_breakfast === 'number' ? (entry as SafeWorkEntry) : buildSafeWorkEntry(entry)

  // eslint-disable-next-line no-console
  console.log('[4a. REPO] 💾 upsertWorkEntry', safeEntry)

  if (Capacitor.isNativePlatform()) {
    await upsertWorkEntryNative(safeEntry)
  }
 else {
    upsertWorkEntryWeb(safeEntry)
  }
}
