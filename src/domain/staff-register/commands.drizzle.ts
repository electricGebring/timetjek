/**
 * Node.js-based domain commands using Drizzle ORM
 * Used in backend/sync contexts (not in browser)
 */

import { createLogger } from '../../utils/logger.ts'
import * as staffRepo from '../../db/staff-register/repo.ts'
import type { WorkEntry } from '../../models/work-entry.schema.ts'
import { TimeRegistrationStatus } from '../../enums/TimeRegistrationStatus.ts'

const logger = createLogger('StaffRegisterDomain-Drizzle')

export async function createWorkEntry(entry: Partial<WorkEntry>) {
  const { buildSafeWorkEntry } = await import('../../db/staff-register/work-entry.helpers.ts')

  const safeEntry = buildSafeWorkEntry(entry)

  logger.log('[DRIZZLE] 🧠 Creating work entry...', safeEntry)

  await staffRepo.upsertWorkEntry(safeEntry)

  logger.log('[DRIZZLE] ✅ Work entry created')
}

export async function updateWorkEntry(entry: Partial<WorkEntry>) {
  if (entry.id === null || entry.id === undefined) {
    throw new Error('Cannot update entry without id')
  }

  if (entry.check_out_at) {
    if (entry.check_in_at && !entry.total_working_seconds && !entry.break) {
      entry.total_working_seconds = staffRepo.calculateTotalWorkingSeconds(
        entry.check_in_at as string,
        entry.check_out_at as string,
        null
      )
    }

    if (entry.break && !entry.total_break_seconds) {
      entry.total_break_seconds = staffRepo.calculateTotalWorkingSeconds(
        entry.check_in_at as string,
        entry.check_out_at as string,
        entry.break as string
      )
    }

    if (entry.status === TimeRegistrationStatus.OPEN) {
      entry.status = TimeRegistrationStatus.CLOSED
    }
  }

  entry.updatedAt = new Date().toISOString()
  entry.synced = 0 // Mark as unsynced for sync engine

  logger.log('[DRIZZLE] 🔄 Updating work entry...', entry)

  await staffRepo.upsertWorkEntry(entry)

  logger.log('[DRIZZLE] ✅ Work entry updated')
}

export async function deleteWorkEntry(id: string | number) {
  logger.log('[DRIZZLE] 🗑️ Soft deleting work entry...', { id })

  await staffRepo.softDeleteWorkEntry(id)

  logger.log('[DRIZZLE] ✅ Work entry soft deleted')
}

export async function hardDeleteWorkEntry(id: string | number) {
  logger.log('[DRIZZLE] 🔥 Hard deleting work entry...', { id })

  await staffRepo.permanentDeleteWorkEntry(id)

  logger.log('[DRIZZLE] ✅ Work entry hard deleted')
}

export async function restoreWorkEntry(id: string | number) {
  logger.log('[DRIZZLE] ↩️ Restoring work entry...', { id })

  await staffRepo.restoreWorkEntry(id)

  logger.log('[DRIZZLE] ✅ Work entry restored')
}
