/**
 * Domain layer that handles business logic and validation.
 * Communicates with the database repository.
 * 
 * Note: Sync is handled automatically by the OnlineOfflineCoordinator
 * when connectivity changes. For always-online apps, immediate sync
 * can be triggered on mutations (optional).
 */

// Re-export domain logic for todos and staff-register
export { updateStoreFromDb as updateTodosStoreFromDb, getAll, create, deleteTodo, mergeRemoteTodo } from './todos/domain'
export { updateStoreFromDb as updateStaffRegisterStoreFromDb, getAllWorkEntries, canCheckIn, createWorkEntry, deleteWorkEntry, getUnsyncedWorkEntries, getDeletedWorkEntries, upsertWorkEntryFromApi, getWorkSchemeGrouped } from './staff-register/domain'
