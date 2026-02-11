/**
 * Write use cases: create, update, delete work entries.
 * Orchestrates repo, business rules, and sync trigger.
 */

import * as staffRepo from '@/db/staff-register/repo'
import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'
import { createLogger } from '@/utils/logger'
import { triggerSyncIfOnline } from '../services/sync-trigger'

const logger = createLogger('StaffRegisterDomain')

export async function createWorkEntry(entry: Record<string, unknown>) {
  const now = new Date().toISOString()
  const safeEntry = {
    ...entry,
    status: entry.status ?? TimeRegistrationStatus.OPEN,
    check_in_at: entry.check_in_at ?? now,
    check_out_at: entry.check_out_at ?? null,
    break: entry.break ?? null,
    total_working_seconds: entry.total_working_seconds ?? null,
    total_break_seconds: entry.total_break_seconds ?? null,
    createdAt: now,
    updatedAt: now,
    deleted_at: null,
    synced: 0,
    deleted: 0
  }
  logger.log('[3. DOMAIN] 🧠 Creating work entry...', safeEntry)
  await staffRepo.upsertWorkEntry(safeEntry)
  logger.log('[5. DOMAIN] 🔄 Triggering sync...')
  await triggerSyncIfOnline('mutation')
}

export async function updateWorkEntry(entry: Record<string, unknown> & { id?: unknown }) {
  if (entry.id == null) {
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
  entry.synced = 0 // Mark as unsynced so sync engine will push this update
  await staffRepo.upsertWorkEntry(entry)
  await triggerSyncIfOnline('mutation')
}

export async function deleteWorkEntry(_id: number) {
  // Optional: await staffRepo.softDeleteWorkEntry(id); await triggerSyncIfOnline('mutation')
}
