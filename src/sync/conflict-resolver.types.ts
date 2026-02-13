import type { ConflictResolutionStrategy } from '@/enums/ConflictResolutionStrategy'

export type { ConflictResolutionStrategy } from '@/enums/ConflictResolutionStrategy'

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
