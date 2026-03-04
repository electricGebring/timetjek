/**
 * Re-export for backwards compatibility.
 * New code should use @/api/work-entries instead.
 */
export { fetchWorkEntries as fetchStaffRegisterEntries, createEntry, updateEntry, deleteEntry } from './work-entries'
