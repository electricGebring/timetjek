import { count, eq, isNull, and } from 'drizzle-orm'

import { getWorkEntries } from '@/db/work-entries/repo'

import { getDb } from '@/db/drizzle'

import { workEntries as workEntriesTable } from '@/db/schema'

import { Capacitor } from '@capacitor/core'

/**
 * Get work entry history
 * @param days - How many days back (default: 30)
 * @returns Array of entries sorted by date desc
 */
export async function getWorkHistory(days: number = 30) {
  const cutoffDate = new Date()

  cutoffDate.setDate(cutoffDate.getDate() - days)

  const entries = await getWorkEntries()

  return entries
    .filter((e) => !e.deleted_at && e.check_in_at && new Date(e.check_in_at) > cutoffDate)
    .sort((a, b) => {
      const timeA = a.check_in_at ? new Date(a.check_in_at).getTime() : 0

      const timeB = b.check_in_at ? new Date(b.check_in_at).getTime() : 0

      return timeB - timeA // newest first
    })
}

/**
 * Get entries for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Entries for that day
 */
export async function getEntriesForDate(date: string) {
  const all = await getWorkEntries()

  return all.filter((e) => e.check_in_at?.startsWith(date) && !e.deleted_at)
}

/**
 * Get current status for today
 * @returns { isClockedIn, currentEntry, hoursToday }
 */
export async function getCurrentStatus() {
  const today = new Date().toISOString().split('T')[0] || ''

  const todayEntries = await getEntriesForDate(today)

  const lastEntry = todayEntries[0] || null

  const isClockedIn = !!lastEntry?.check_in_at && !lastEntry?.check_out_at

  const totalSeconds = todayEntries.reduce((sum, e) => sum + (e.total_working_seconds || 0), 0)

  const hoursToday = Math.round((totalSeconds / 3600) * 100) / 100

  return {
    isClockedIn,
    currentEntry: lastEntry,
    hoursToday
  }
}

/**
 * Get all entries (no filters)
 * @returns All work entries in database
 */
export async function getAllEntries() {
  try {
    const entries = await getWorkEntries()

    return entries
      .filter((e) => !e.deleted_at)
      .sort((a, b) => {
        const timeA = a.check_in_at ? new Date(a.check_in_at).getTime() : 0

        const timeB = b.check_in_at ? new Date(b.check_in_at).getTime() : 0

        return timeB - timeA // newest first
      })
  }
 catch (e) {
    console.warn('Failed to fetch all entries:', e)

    return []
  }
}

/**
 * Get database info and statistics
 * @returns Database metadata and stats
 */
export async function getDatabaseInfo() {
  try {
    const db = getDb()

    const notDeleted = and(isNull(workEntriesTable.deleted_at))

    const [totalResult, syncedResult, unsyncedResult, deletedResult] = await Promise.all([
      db.select({ count: count() }).from(workEntriesTable).where(notDeleted),
      db.select({ count: count() }).from(workEntriesTable).where(and(eq(workEntriesTable.synced, 1), notDeleted)),
      db.select({ count: count() }).from(workEntriesTable).where(and(eq(workEntriesTable.synced, 0), notDeleted)),
      db.select({ count: count() }).from(workEntriesTable).where(eq(workEntriesTable.deleted, 1))
    ])

    return {
      totalEntries: totalResult[0]?.count ?? 0,
      syncedEntries: syncedResult[0]?.count ?? 0,
      unsyncedEntries: unsyncedResult[0]?.count ?? 0,
      deletedEntries: deletedResult[0]?.count ?? 0,
      platform: Capacitor.isNativePlatform() ? 'native' : 'web',
      databaseType: Capacitor.isNativePlatform() ? 'Capacitor SQLite' : 'sql.js (IndexedDB)'
    }
  }
 catch (e) {
    console.warn('Failed to fetch database info:', e)

    return {
      totalEntries: 0,
      syncedEntries: 0,
      unsyncedEntries: 0,
      deletedEntries: 0,
      platform: 'unknown',
      databaseType: 'unknown',
      error: (e as Error).message
    }
  }
}

/**
 * Clear all local data (dev only)
 * WARNING: Irreversible!
 */
export async function clearAllData() {
  try {
    await getDb().delete(workEntriesTable)

    // Persist to localStorage (web only)
    if (!Capacitor.isNativePlatform()) {
      const { getDB } = await import('@/db/index')

      const db = getDB() as { saveDatabase?: () => void }

      db.saveDatabase?.()
    }

    console.warn('✓ All local data cleared')
  }
 catch (e) {
    console.error('Failed to clear data:', e)
  }
}

/**
 * Get pending sync operations (unsynced entries updated recently)
 * @returns Array of unsynced work entries sorted by updatedAt desc
 */
export async function getPendingSyncOperations() {
  try {
    const entries = await getWorkEntries()

    const now = Date.now()

    const oneDayAgo = now - 24 * 60 * 60 * 1000

    // Filter for unsynced items (synced = 0) updated recently
    return entries
      .filter((e) => {
        if (e.deleted_at || e.synced !== 0) return false

        // Only show entries updated in last 24h (real pending mutations)
        const updatedTime = e.updatedAt ? new Date(e.updatedAt).getTime() : 0

        return updatedTime > oneDayAgo
      })
      .sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0

        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0

        return timeB - timeA // newest first
      })
  }
 catch (e) {
    console.warn('Failed to fetch pending sync operations:', e)

    return []
  }
}

// ─────────────────────────────────────────────────────────
// Export for debugging
// ─────────────────────────────────────────────────────────

export interface WorkEntriesService {
  getWorkHistory: typeof getWorkHistory
  getEntriesForDate: typeof getEntriesForDate
  getCurrentStatus: typeof getCurrentStatus
  getAllEntries: typeof getAllEntries
  getDatabaseInfo: typeof getDatabaseInfo
  clearAllData: typeof clearAllData
  getPendingSyncOperations: typeof getPendingSyncOperations
}

declare global {
  interface Window {
    workEntriesService: WorkEntriesService
  }
}

window.workEntriesService = {
  getWorkHistory,
  getEntriesForDate,
  getCurrentStatus,
  getAllEntries,
  getDatabaseInfo,
  clearAllData,
  getPendingSyncOperations
}
