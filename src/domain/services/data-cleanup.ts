import { getDB } from '@/db/index'

import { Capacitor } from '@capacitor/core'

import { getPoliciesNeedingCleanup } from '../config/data-policies'

export type CleanupConfig = {
  retentionDays: number
  tableName: string
  softDeleteOnly?: boolean
}

/** WHERE clause and params for cleanup: either soft-deleted only or all rows older than cutoff (createdAt or updatedAt). */
function buildCleanupQueries(
  tableName: string,
  softDeleteOnly: boolean,
  cutoffTimestamp: number
): { countSql: string; deleteSql: string; params: number[] } {
  if (softDeleteOnly) {
    const sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE deleted = 1 AND updatedAt < ?`

    const deleteSql = `DELETE FROM ${tableName} WHERE deleted = 1 AND updatedAt < ?`

    return { countSql: sql, deleteSql, params: [cutoffTimestamp] }
  }

  const where = '(createdAt IS NOT NULL AND createdAt < ?) OR (createdAt IS NULL AND updatedAt < ?)'

  const countSql = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${where}`

  const deleteSql = `DELETE FROM ${tableName} WHERE ${where}`

  return { countSql, deleteSql, params: [cutoffTimestamp, cutoffTimestamp] }
}

/** Minimal DB interface for cleanup: count matching rows, delete them, optionally persist (web). */
type CleanupDb = {
  runCount(sql: string, params: number[]): Promise<number>
  runDelete(sql: string, params: number[]): Promise<void>
  save?(): void
}

function getCleanupDb(): CleanupDb {
  if (Capacitor.isNativePlatform()) {
    const db = getDB() as
      | {
          query: (sql: string, params?: unknown[]) => Promise<{ values?: unknown[][] }>
          run: (sql: string, params?: unknown[]) => Promise<void>
        }
      | Record<string, unknown>

    return {
      async runCount(sql: string, params: number[]) {
        if (!('query' in db) || typeof (db as any).query !== 'function') {
          return 0
        }

        const result = await (db as any).query(sql, params)

        if (!result || !result.values || !Array.isArray(result.values) || result.values.length === 0) {
          return 0
        }

        const val = result.values[0]?.[0]

        return typeof val === 'number' ? val : 0
      },
      async runDelete(sql: string, params: number[]) {
        if ('run' in db && typeof db.run === 'function') {
          await (db as any).run(sql, params)
        }
      }
    }
  }

  const dbObj = getDB() as Record<string, unknown>

  const sqlJsDb = dbObj['sqlJsDb'] as {
    exec: (sql: string, params?: unknown[]) => { values?: unknown[][] }[]
    run: (sql: string, params?: unknown[]) => void
  }

  const saveDatabase = dbObj['saveDatabase'] as (() => void) | undefined

  return {
    async runCount(sql: string, params: number[]) {
      if (!sqlJsDb || typeof sqlJsDb.exec !== 'function') return 0

      const results = sqlJsDb.exec(sql, params)

      if (
        !results ||
        results.length === 0 ||
        !results[0] ||
        !Array.isArray(results[0].values) ||
        results[0].values.length === 0
      ) {
        return 0
      }

      const val = results[0].values[0]?.[0]

      return typeof val === 'number' ? val : 0
    },
    async runDelete(sql: string, params: number[]) {
      if (sqlJsDb && typeof sqlJsDb.run === 'function') {
        sqlJsDb.run(sql, params)
      }
    },
    save: saveDatabase
  }
}

/**
 * Clean up expired data based on retention policy
 * Removes data older than retentionDays
 */
export async function cleanupExpiredData(config: CleanupConfig): Promise<number> {
  const { retentionDays, tableName, softDeleteOnly = false } = config

  const cutoffTimestamp = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60

  const { countSql, deleteSql, params } = buildCleanupQueries(tableName, softDeleteOnly, cutoffTimestamp)

  const db = getCleanupDb()

  const count = await db.runCount(countSql, params)

  await db.runDelete(deleteSql, params)

  db.save?.()

  return count
}

/**
 * Clean up all tables based on their configured policies
 */
export async function cleanupAllTables(): Promise<Record<string, number>> {
  const policies = getPoliciesNeedingCleanup()

  const results: Record<string, number> = {}

  for (const policy of policies) {
    if (!policy.retentionDays) continue

    try {
      if (policy.customCleanup) {
        // Use custom cleanup function if provided
        results[policy.tableName] = await policy.customCleanup(policy.tableName)
      } else {
        // Use standard cleanup
        results[policy.tableName] = await cleanupExpiredData({
          retentionDays: policy.retentionDays,
          tableName: policy.tableName,
          softDeleteOnly: policy.softDeleteOnly ?? false
        })
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[Cleanup] Failed to clean up ${policy.tableName}:`, error)

      results[policy.tableName] = 0
    }
  }

  return results
}
/**
 * Get storage statistics
 */

export async function getStorageStats(tableName: string): Promise<{
  totalRecords: number
  softDeleted: number
  unsynced: number
  oldestRecord: number | null
  newestRecord: number | null
}> {
  if (Capacitor.isNativePlatform()) {
    const db = getDB() as
      | {
          query: (sql: string, params?: unknown[]) => Promise<{ values?: unknown[][] }>
        }
      | Record<string, unknown>

    if (!('query' in db) || typeof (db as any).query !== 'function') {
      return {
        totalRecords: 0,
        softDeleted: 0,
        unsynced: 0,
        oldestRecord: null,
        newestRecord: null
      }
    }

    const totalRes = await (db as any).query(`SELECT COUNT(*) as count FROM ${tableName}`)

    const deletedRes = await (db as any).query(`SELECT COUNT(*) as count FROM ${tableName} WHERE deleted = 1`)

    const unsyncedRes = await (db as any).query(`SELECT COUNT(*) as count FROM ${tableName} WHERE synced = 0`)

    const oldestRes = await (db as any).query(
      `SELECT MIN(updatedAt) as oldest FROM ${tableName} WHERE updatedAt IS NOT NULL`
    )

    const newestRes = await (db as any).query(
      `SELECT MAX(updatedAt) as newest FROM ${tableName} WHERE updatedAt IS NOT NULL`
    )

    function extractValue(res: { values?: unknown[][] }, nullIfEmpty = false): number | null {
      if (!res || !res.values || !Array.isArray(res.values) || res.values.length === 0) {
        return nullIfEmpty ? null : 0
      }

      const val = res.values[0]?.[0]

      return typeof val === 'number' ? val : nullIfEmpty ? null : 0
    }

    return {
      totalRecords: extractValue(totalRes) ?? 0,
      softDeleted: extractValue(deletedRes) ?? 0,
      unsynced: extractValue(unsyncedRes) ?? 0,
      oldestRecord: extractValue(oldestRes, true),
      newestRecord: extractValue(newestRes, true)
    }
  } else {
    const dbObj = getDB() as Record<string, unknown>

    const sqlJsDb = dbObj['sqlJsDb'] as {
      exec: (sql: string, params?: unknown[]) => { values?: unknown[][] }[]
    }

    if (!sqlJsDb || typeof sqlJsDb.exec !== 'function') {
      return {
        totalRecords: 0,
        softDeleted: 0,
        unsynced: 0,
        oldestRecord: null,
        newestRecord: null
      }
    }

    function extractValueArr(arr: { values?: unknown[][] }[], nullIfEmpty = false): number | null {
      if (!arr || arr.length === 0 || !arr[0] || !Array.isArray(arr[0].values) || arr[0].values.length === 0) {
        return nullIfEmpty ? null : 0
      }

      const val = arr[0].values[0]?.[0]

      return typeof val === 'number' ? val : nullIfEmpty ? null : 0
    }

    const totalRes = sqlJsDb.exec(`SELECT COUNT(*) as count FROM ${tableName}`)

    const deletedRes = sqlJsDb.exec(`SELECT COUNT(*) as count FROM ${tableName} WHERE deleted = 1`)

    const unsyncedRes = sqlJsDb.exec(`SELECT COUNT(*) as count FROM ${tableName} WHERE synced = 0`)

    const oldestRes = sqlJsDb.exec(`SELECT MIN(updatedAt) as oldest FROM ${tableName} WHERE updatedAt IS NOT NULL`)

    const newestRes = sqlJsDb.exec(`SELECT MAX(updatedAt) as newest FROM ${tableName} WHERE updatedAt IS NOT NULL`)

    return {
      totalRecords: extractValueArr(totalRes) ?? 0,
      softDeleted: extractValueArr(deletedRes) ?? 0,
      unsynced: extractValueArr(unsyncedRes) ?? 0,
      oldestRecord: extractValueArr(oldestRes, true),
      newestRecord: extractValueArr(newestRes, true)
    }
  }
}
