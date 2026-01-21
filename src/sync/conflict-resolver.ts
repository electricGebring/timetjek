/**
 * Conflict resolution strategies for syncing data
 */

export type ConflictResolutionStrategy = 'last-write-wins' | 'local-wins' | 'remote-wins' | 'field-merge'

export type ConflictResolutionResult<T> = {
  resolved: T
  strategy: ConflictResolutionStrategy
  conflictDetected: boolean
}

export interface ConflictResolver {
  resolve<T extends { updatedAt?: number }>(
    local: T,
    remote: T,
    strategy?: ConflictResolutionStrategy
  ): ConflictResolutionResult<T>
}

/**
 * Default conflict resolver implementing last-write-wins strategy
 */
export class DefaultConflictResolver implements ConflictResolver {
  resolve<T extends { updatedAt?: number }>(
    local: T,
    remote: T,
    strategy: ConflictResolutionStrategy = 'last-write-wins'
  ): ConflictResolutionResult<T> {
    // If no timestamps, default to remote (server is source of truth)
    if (!local.updatedAt && !remote.updatedAt) {
      return {
        resolved: remote,
        strategy: 'remote-wins',
        conflictDetected: false,
      }
    }

    // If only one has timestamp, use that one
    if (!local.updatedAt) {
      return {
        resolved: remote,
        strategy: 'remote-wins',
        conflictDetected: true,
      }
    }

    if (!remote.updatedAt) {
      return {
        resolved: local,
        strategy: 'local-wins',
        conflictDetected: true,
      }
    }

    // Both have timestamps - apply strategy
    switch (strategy) {
      case 'last-write-wins':
        return {
          resolved: remote.updatedAt >= local.updatedAt ? remote : local,
          strategy: 'last-write-wins',
          conflictDetected: remote.updatedAt !== local.updatedAt,
        }

      case 'local-wins':
        return {
          resolved: local,
          strategy: 'local-wins',
          conflictDetected: true,
        }

      case 'remote-wins':
        return {
          resolved: remote,
          strategy: 'remote-wins',
          conflictDetected: true,
        }

      case 'field-merge':
        // For field merge, we'd need to know which fields changed
        // For now, fall back to last-write-wins
        return {
          resolved: remote.updatedAt >= local.updatedAt ? remote : local,
          strategy: 'last-write-wins',
          conflictDetected: remote.updatedAt !== local.updatedAt,
        }

      default:
        return {
          resolved: remote,
          strategy: 'remote-wins',
          conflictDetected: true,
        }
    }
  }
}

export const defaultConflictResolver = new DefaultConflictResolver()
