import { createLogger } from '@/utils/logger'

import { triggerSyncIfOnline } from '../services/sync-trigger'

import { WorkEntryValidationError } from './errors'

import type { WorkEntry } from '@/db/schema'

import type { Entry } from '@/views/staffRegister/types'

import * as staffRepo from '@/db/work-entries/repo'

import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

const logger = createLogger('WorkEntriesDomain')

export async function createWorkEntry(entry: Entry | Partial<WorkEntry> | Record<string, unknown>) {
  const { buildSafeWorkEntry } = await import('@/db/work-entries/work-entry.helpers')

  const safeEntry = buildSafeWorkEntry(entry as Record<string, unknown>)

  logger.log('[3. DOMAIN] 🧠 Creating work entry...', safeEntry)

  await staffRepo.upsertWorkEntry(safeEntry)

  // Trigger sync only after upsert completes so insert is visible before sync runs
  logger.log('[5. DOMAIN] 🔄 Triggering sync...')

  triggerSyncIfOnline('mutation')
}

export async function updateWorkEntry(entry: Entry | Partial<WorkEntry> | Record<string, unknown>) {
  const e = entry as Record<string, unknown>

  if (e.id === null || e.id === undefined) {
    throw new WorkEntryValidationError('Cannot update entry without id')
  }

  if (e.check_out_at) {
    if (e.check_in_at && !e.total_working_seconds && !e.break) {
      e.total_working_seconds = staffRepo.calculateTotalWorkingSeconds(
        e.check_in_at as string,
        e.check_out_at as string,
        null
      )
    }

    if (e.break && !e.total_break_seconds) {
      e.total_break_seconds = staffRepo.calculateTotalWorkingSeconds(
        e.check_in_at as string,
        e.check_out_at as string,
        e.break as string
      )
    }

    if (e.status === TimeRegistrationStatus.OPEN) {
      e.status = TimeRegistrationStatus.CLOSED
    }
  }

  e.updatedAt = new Date().toISOString()

  e.synced = 0 // Mark as unsynced so sync engine will push this update

  await staffRepo.upsertWorkEntry(entry as Record<string, unknown>)

  // Trigger sync only after upsert completes
  triggerSyncIfOnline('mutation')
}

export async function deleteWorkEntry(_id: string) {
  await staffRepo.softDeleteWorkEntry(_id)

  triggerSyncIfOnline('mutation')
}
