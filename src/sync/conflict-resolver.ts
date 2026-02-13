/**
 * Conflict resolution strategies for syncing data
 */

import { ConflictResolutionStrategy as Strategy } from '@/enums/ConflictResolutionStrategy'
import type { ConflictResolutionStrategy, ConflictResolutionResult, ConflictResolver } from './conflict-resolver.types'

export class DefaultConflictResolver implements ConflictResolver {
  resolve<T extends { updatedAt?: number }>(
    local: T,
    remote: T,
    strategy: ConflictResolutionStrategy = Strategy.LAST_WRITE_WINS
  ): ConflictResolutionResult<T> {
    // If no timestamps, default to remote (server is source of truth)
    if (!local.updatedAt && !remote.updatedAt) {
      return {
        resolved: remote,
        strategy: Strategy.REMOTE_WINS,
        conflictDetected: false
      }
    }

    // If only one has timestamp, use that one
    if (!local.updatedAt) {
      return {
        resolved: remote,
        strategy: Strategy.REMOTE_WINS,
        conflictDetected: true
      }
    }

    if (!remote.updatedAt) {
      return {
        resolved: local,
        strategy: Strategy.LOCAL_WINS,
        conflictDetected: true
      }
    }

    // Both have timestamps - apply strategy
    switch (strategy) {
      case Strategy.LAST_WRITE_WINS:
        return {
          resolved: remote.updatedAt >= local.updatedAt ? remote : local,
          strategy: Strategy.LAST_WRITE_WINS,
          conflictDetected: remote.updatedAt !== local.updatedAt
        }

      case Strategy.LOCAL_WINS:
        return {
          resolved: local,
          strategy: Strategy.LOCAL_WINS,
          conflictDetected: true
        }

      case Strategy.REMOTE_WINS:
        return {
          resolved: remote,
          strategy: Strategy.REMOTE_WINS,
          conflictDetected: true
        }

      case Strategy.FIELD_MERGE:
        // For field merge, we'd need to know which fields changed
        // For now, fall back to last-write-wins
        return {
          resolved: remote.updatedAt >= local.updatedAt ? remote : local,
          strategy: Strategy.LAST_WRITE_WINS,
          conflictDetected: remote.updatedAt !== local.updatedAt
        }

      default:
        return {
          resolved: remote,
          strategy: Strategy.REMOTE_WINS,
          conflictDetected: true
        }
    }
  }
}

export const defaultConflictResolver = new DefaultConflictResolver()
