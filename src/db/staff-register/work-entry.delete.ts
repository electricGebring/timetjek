import { getDB } from '../index'

import { Capacitor } from '@capacitor/core'

import { WORK_ENTRY_SQL } from './work-entry.sql'

const SQL = WORK_ENTRY_SQL

async function runStatement(sql: string, params: unknown[]) {
  if (Capacitor.isNativePlatform()) {
    await getDB().run(sql, params as unknown[])
  }
 else {
    const { sqlJsDb, saveDatabase } = getDB() as {
      sqlJsDb: { run: (sql: string, params: unknown[]) => void }
      saveDatabase: () => void
    }

    sqlJsDb.run(sql, params)

    saveDatabase()
  }
}

export async function softDeleteWorkEntry(id: number) {
  const now = new Date().toISOString()

  await runStatement(SQL.UPDATE_SOFT_DELETE, [now, id])
}

export async function restoreWorkEntry(id: number) {
  await runStatement(SQL.UPDATE_RESTORE, [id])
}

export async function markWorkEntryAsSynced(id: number) {
  await runStatement(SQL.UPDATE_SYNCED, [id])
}

export async function permanentDeleteWorkEntry(id: number) {
  await runStatement(SQL.DELETE_BY_ID, [id])
}
