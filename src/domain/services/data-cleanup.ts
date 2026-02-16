import { getDB } from '@/db/index'
import { Capacitor } from '@capacitor/core'
import { getPoliciesNeedingCleanup } from '../config/data-policies'

export type CleanupConfig = {
  retentionDays: number
  tableName: string
  softDeleteOnly?: boolean // Only clean up soft-deleted items
}

/**
 * Clean up expired data based on retention policy
 * Removes data older than retentionDays
 */
export async function cleanupExpiredData(config: CleanupConfig): Promise<number> {
  const { retentionDays, tableName, softDeleteOnly = false } = config
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60

  if (Capacitor.isNativePlatform()) {
    const db = getDB()

    if (softDeleteOnly) {
      // Only delete items that are already soft-deleted
      const result = await db.query(
        `SELECT COUNT(*) as count FROM ${tableName} 
         WHERE deleted = 1 AND updatedAt < ?`,
        [cutoffTimestamp]
      )
      const count = result.values?.[0]?.[0] ?? 0

      await db.run(
        `DELETE FROM ${tableName} 
         WHERE deleted = 1 AND updatedAt < ?`,
        [cutoffTimestamp]
      )

      return count as number
    } else {
      // Delete all items older than retention period (use createdAt if available, else updatedAt)
      // First check if createdAt column exists
      const result = await db.query(
        `SELECT COUNT(*) as count FROM ${tableName} 
         WHERE (createdAt IS NOT NULL AND createdAt < ?) 
            OR (createdAt IS NULL AND updatedAt < ?)`,
        [cutoffTimestamp, cutoffTimestamp]
      )
      const count = result.values?.[0]?.[0] ?? 0

      await db.run(
        `DELETE FROM ${tableName} 
         WHERE (createdAt IS NOT NULL AND createdAt < ?) 
            OR (createdAt IS NULL AND updatedAt < ?)`,
        [cutoffTimestamp, cutoffTimestamp]
      )

      return count as number
    }
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any

    if (softDeleteOnly) {
      const results = sqlJsDb.exec(
        `SELECT COUNT(*) as count FROM ${tableName} 
         WHERE deleted = 1 AND updatedAt < ?`,
        [cutoffTimestamp]
      )
      const count = results.length > 0 && results[0].values.length > 0 ? results[0].values[0][0] : 0

      sqlJsDb.run(
        `DELETE FROM ${tableName} 
         WHERE deleted = 1 AND updatedAt < ?`,
        [cutoffTimestamp]
      )

      saveDatabase()
      return count as number
    } else {
      const results = sqlJsDb.exec(
        `SELECT COUNT(*) as count FROM ${tableName} 
         WHERE (createdAt IS NOT NULL AND createdAt < ?) 
            OR (createdAt IS NULL AND updatedAt < ?)`,
        [cutoffTimestamp, cutoffTimestamp]
      )
      const count = results.length > 0 && results[0].values.length > 0 ? results[0].values[0][0] : 0

      sqlJsDb.run(
        `DELETE FROM ${tableName} 
         WHERE (createdAt IS NOT NULL AND createdAt < ?) 
            OR (createdAt IS NULL AND updatedAt < ?)`,
        [cutoffTimestamp, cutoffTimestamp]
      )

      saveDatabase()
      return count as number
    }
  }
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
    const db = getDB()

    const totalRes = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`)
    const deletedRes = await db.query(`SELECT COUNT(*) as count FROM ${tableName} WHERE deleted = 1`)
    const unsyncedRes = await db.query(`SELECT COUNT(*) as count FROM ${tableName} WHERE synced = 0`)
    const oldestRes = await db.query(`SELECT MIN(updatedAt) as oldest FROM ${tableName} WHERE updatedAt IS NOT NULL`)
    const newestRes = await db.query(`SELECT MAX(updatedAt) as newest FROM ${tableName} WHERE updatedAt IS NOT NULL`)

    return {
      totalRecords: (totalRes.values?.[0]?.[0] ?? 0) as number,
      softDeleted: (deletedRes.values?.[0]?.[0] ?? 0) as number,
      unsynced: (unsyncedRes.values?.[0]?.[0] ?? 0) as number,
      oldestRecord: (oldestRes.values?.[0]?.[0] ?? null) as number | null,
      newestRecord: (newestRes.values?.[0]?.[0] ?? null) as number | null
    }
  } else {
    const { sqlJsDb } = getDB() as any

    const totalRes = sqlJsDb.exec(`SELECT COUNT(*) as count FROM ${tableName}`)
    const deletedRes = sqlJsDb.exec(`SELECT COUNT(*) as count FROM ${tableName} WHERE deleted = 1`)
    const unsyncedRes = sqlJsDb.exec(`SELECT COUNT(*) as count FROM ${tableName} WHERE synced = 0`)
    const oldestRes = sqlJsDb.exec(`SELECT MIN(updatedAt) as oldest FROM ${tableName} WHERE updatedAt IS NOT NULL`)
    const newestRes = sqlJsDb.exec(`SELECT MAX(updatedAt) as newest FROM ${tableName} WHERE updatedAt IS NOT NULL`)

    return {
      totalRecords: totalRes.length > 0 && totalRes[0].values.length > 0 ? totalRes[0].values[0][0] : 0,
      softDeleted: deletedRes.length > 0 && deletedRes[0].values.length > 0 ? deletedRes[0].values[0][0] : 0,
      unsynced: unsyncedRes.length > 0 && unsyncedRes[0].values.length > 0 ? unsyncedRes[0].values[0][0] : 0,
      oldestRecord: oldestRes.length > 0 && oldestRes[0].values.length > 0 ? oldestRes[0].values[0][0] : null,
      newestRecord: newestRes.length > 0 && newestRes[0].values.length > 0 ? newestRes[0].values[0][0] : null
    }
  }
}
