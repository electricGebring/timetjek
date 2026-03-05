import { createLogger } from '@/utils/logger'

import { triggerSyncIfOnline } from '../services/sync-trigger'

import { WorkEntryValidationError } from './errors'

import type { WorkEntry } from '@/models/work-entry.schema'

import * as staffRepo from '@/db/work-entries/repo'

import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

const logger = createLogger('WorkEntriesDomain')

export async function createWorkEntry(entry: Partial<WorkEntry>) {
  const { buildSafeWorkEntry } = await import('@/db/work-entries/work-entry.helpers')

  const safeEntry = buildSafeWorkEntry(entry)

  logger.log('[3. DOMAIN] 🧠 Creating work entry...', safeEntry)

  await staffRepo.upsertWorkEntry(safeEntry)

  logger.log('[5. DOMAIN] 🔄 Triggering sync...')

  await triggerSyncIfOnline('mutation')
}

export async function updateWorkEntry(entry: Partial<WorkEntry>) {
  if (entry.id === null || entry.id === undefined) {
    throw new WorkEntryValidationError('Cannot update entry without id')
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

  entry.synced = 0 // Mark as unsynced so sync engine will push this update

  await staffRepo.upsertWorkEntry(entry)

  await triggerSyncIfOnline('mutation')
}

export async function deleteWorkEntry(_id: string) {
  await staffRepo.softDeleteWorkEntry(_id)

  await triggerSyncIfOnline('mutation')
}
