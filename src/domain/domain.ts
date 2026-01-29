/**
 * Domain layer that handles business logic and validation.
 * Communicates with the database repository.
 * 
 * Note: Sync is handled automatically by the OnlineOfflineCoordinator
 * when connectivity changes. For always-online apps, immediate sync
 * can be triggered on mutations (optional).
 */

// Re-export domain logic for todos and staff-register
export * from './todos/domain'
