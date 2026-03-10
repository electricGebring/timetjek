import * as repo from '@/db/work-entries/repo'
import * as breakRepo from '@/db/work-entry-breaks/repo'

import { batchUpsertBlock } from '@/api/work-entries'

import type { Entry } from '@/views/staffRegister/types'

/**
 * Returns true if the error indicates a 404 (not found).
 */
function is404(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false
  if ('message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message.includes('404')
  }
  if ('status' in e && typeof (e as { status: unknown }).status === 'number') {
    return (e as { status: number }).status === 404
  }
  return false
}

export { is404 }

/**
 * Engine that pushes one work entry block (entry + breaks) to the API in a single batch,
 * then marks local as synced. Avoids partial state if connection drops mid-sync.
 */
export class PushBlockEngine {
  private entry: Entry

  private apiEntry: Entry | null = null

  private syncedBreakIds: string[] = []

  private breakIdsToDelete: string[] = []

  constructor(entry: Entry) {
    this.entry = entry
  }

  /** Run all steps in sequence. Returns the synced API entry. */
  async run(): Promise<Entry> {
    await this.step1BatchPushBlock()
    await this.step2MarkSynced()
    return this.apiEntry!
  }

  /** Step 1: Batch push entry + breaks to API in one request */
  async step1BatchPushBlock(): Promise<void> {
    const localBreaks = await breakRepo.getBreaksByWorkEntryId(this.entry.id)
    const deletedUnsynced = await breakRepo.getDeletedUnsyncedBreaksByWorkEntryId(this.entry.id)
    this.breakIdsToDelete = deletedUnsynced.map((b) => b.id)

    const breaks = localBreaks.map((b) => ({
      id: b.id,
      work_entry_id: this.entry.id,
      start_at: b.start_at,
      end_at: b.end_at,
      start_exact_at: b.start_exact_at,
      end_exact_at: b.end_exact_at
    }))

    const { entry } = await batchUpsertBlock({
      entry: this.entry,
      breaks,
      breakIdsToDelete: this.breakIdsToDelete
    })

    this.apiEntry = entry
    this.syncedBreakIds = localBreaks.map((b) => b.id)
  }

  /** Step 2: Mark local breaks and work entry as synced, permanent-delete locally deleted breaks */
  async step2MarkSynced(): Promise<void> {
    if (!this.apiEntry) throw new Error('step1BatchPushBlock must run first')
    if (this.syncedBreakIds.length > 0) {
      await breakRepo.markBreaksAsSynced(this.syncedBreakIds)
    }
    for (const id of this.breakIdsToDelete) {
      await breakRepo.permanentDeleteBreak(id)
    }
    await repo.upsertWorkEntry(repo.entryToWorkEntry({ ...this.apiEntry, synced: 1 }))
  }
}
