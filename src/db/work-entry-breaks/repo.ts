/**
 * Work Entry Breaks Repository
 * CRUD operations for work_entry_breaks table
 */

export { insertBreak, insertManyBreaks } from './work-entry-break.create'
export {
  getBreaksByWorkEntryId,
  getDeletedUnsyncedBreaksByWorkEntryId,
  getBreakById,
  getAllBreaks,
  getBreaksGroupedByWorkEntryId,
  hasUnsyncedBreaks
} from './work-entry-break.read'
export { updateBreak } from './work-entry-break.update'
export {
  deleteBreak,
  deleteBreaksByWorkEntryId,
  permanentDeleteBreak,
  markBreakAsSynced,
  markBreaksAsSynced
} from './work-entry-break.delete'
