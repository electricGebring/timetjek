/**
 * Conflict resolution strategy when local and remote data differ during sync.
 * Use across domain config, sync layer, and adapters.
 */
export const ConflictResolutionStrategy = {
  /** Newer updatedAt wins (default) */
  LAST_WRITE_WINS: 'last-write-wins',
  /** Keep local version (e.g. drafts) */
  LOCAL_WINS: 'local-wins',
  /** Always accept remote (server-authoritative) */
  REMOTE_WINS: 'remote-wins',
  /** Field-level merge (placeholder; currently falls back to last-write-wins) */
  FIELD_MERGE: 'field-merge'
} as const

export type ConflictResolutionStrategy =
  (typeof ConflictResolutionStrategy)[keyof typeof ConflictResolutionStrategy]
