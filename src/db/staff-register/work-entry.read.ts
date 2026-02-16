import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'
import type { WorkEntry } from '@/models/work-entry.schema'
import { mapRowToWorkEntry } from './work-entry.mapper'
import { WORK_ENTRY_SQL } from './work-entry.sql'

const SQL = WORK_ENTRY_SQL

async function queryWorkEntries(where: string, params: unknown[] = []): Promise<WorkEntry[]> {
  const sql = `${SQL.SELECT_WHERE} ${where}`.trim()
  if (Capacitor.isNativePlatform()) {
    const res = await getDB().query(sql, params as any[])
    if (!res.values) return []
    return res.values.map(mapRowToWorkEntry)
  }
  const { sqlJsDb } = getDB() as any
  const results = sqlJsDb.exec(sql, params)
  if (results.length === 0) return []
  return results[0].values.map(mapRowToWorkEntry)
}

export async function getWorkEntries() {
  return queryWorkEntries('WHERE deleted = 0 AND deleted_at IS NULL')
}

export async function getUnsyncedWorkEntries() {
  return queryWorkEntries('WHERE synced = 0 AND deleted = 0 AND deleted_at IS NULL')
}

export async function getDeletedWorkEntries() {
  return queryWorkEntries('WHERE deleted = 1 AND synced = 0')
}
