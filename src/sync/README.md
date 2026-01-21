# Sync Layer

The sync layer implements a robust offline-first synchronization system using the outbox pattern. It handles network connectivity, automatic syncing, conflict resolution, and retry logic.

## Overview

The sync layer is responsible for:
- **Monitoring connectivity** and triggering sync when online
- **Syncing local changes** to the server (outbox pattern)
- **Pulling remote changes** from the server (incremental when possible)
- **Resolving conflicts** when local and remote data differ
- **Retrying failed operations** with exponential backoff
- **Managing sync state** and metadata

## Architecture

The sync layer follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│  Domain Layer (Ports & Services)      │
│  - SyncPort interface                   │
│  - ConnectivityPort interface          │
│  - OnlineOfflineCoordinator            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Sync Layer                             │
│  - Connectivity Adapter                 │
│  - Sync Manager                         │
│  - Sync Engine                          │
│  - Conflict Resolver                    │
│  - Retry Utils                          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Infrastructure Layer                   │
│  - API Clients                          │
│  - Repositories                         │
│  - Database                             │
└─────────────────────────────────────────┘
```

## Components

### 1. CapacitorConnectivityAdapter

**File**: `capacitor-connectivity.adapter.ts`

**Purpose**: Adapter that implements the `ConnectivityPort` interface using Capacitor's Network API.

**Responsibilities**:
- Get current network status
- Subscribe to network status changes
- Provide connectivity state (online/offline, connection type)

**Usage**:
```typescript
const adapter = new CapacitorConnectivityAdapter()
const state = await adapter.getCurrent()
// { online: true, connectionType: 'wifi' }

const unsubscribe = adapter.subscribe((state) => {
  console.log('Network changed:', state.online)
})
```

### 2. SyncEngine

**File**: `sync-engine.ts`

**Purpose**: Core sync engine that implements the outbox pattern. Handles the actual synchronization of data.

**Responsibilities**:
- Drain outbox (push local changes to API)
- Drain deletions (delete from API)
- Pull remote changes (fetch and merge)
- Track sync state and metadata
- Use retry logic for network operations
- Use conflict resolution for concurrent edits

**Sync Flow**:
1. **Drain Outbox**: Push unsynced local changes to API
   - Tries batch operations first (if available)
   - Falls back to individual operations
   - Uses retry logic for network errors
2. **Drain Deletions**: Delete items from API that are marked deleted locally
   - Tries batch delete first
   - Falls back to individual deletes
3. **Pull Remote Changes**: Fetch changes from API
   - Uses incremental sync when possible (only changes since last sync)
   - Falls back to full sync if incremental fails
   - Resolves conflicts using conflict resolver
   - Updates local database and store

**Usage**:
```typescript
const engine = new SyncEngine({ logger: console })
await engine.start('connectivity-online')
```

### 3. ConflictResolver

**File**: `conflict-resolver.ts`

**Purpose**: Resolves conflicts when local and remote data differ.

**Strategies**:
- `last-write-wins` (default): Uses `updatedAt` timestamp to determine winner
- `local-wins`: Always keep local changes
- `remote-wins`: Always accept remote changes
- `field-merge`: Placeholder for future field-level merging

**Usage**:
```typescript
import { defaultConflictResolver } from './conflict-resolver'

const resolution = defaultConflictResolver.resolve(localTodo, remoteTodo, 'last-write-wins')
// { resolved: Todo, strategy: 'last-write-wins', conflictDetected: true }
```

### 4. Retry Utils

**File**: `retry-utils.ts`

**Purpose**: Provides retry logic with exponential backoff for network operations.

**Features**:
- Exponential backoff (1s → 2s → 4s → 8s, capped at 30s)
- Configurable retry counts and delays
- Retryable error detection
- Only retries on network/timeout/server errors

**Default Configuration**:
- Max retries: 3
- Initial delay: 1 second
- Max delay: 30 seconds
- Backoff multiplier: 2

**Usage**:
```typescript
import { retryWithBackoff } from './retry-utils'

await retryWithBackoff(
  async () => await api.fetchData(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    retryableErrors: ['NetworkError', 'Failed to fetch'],
  }
)
```

### 5. SyncManager

**File**: `sync-manager.ts`

**Purpose**: Orchestrates sync for multiple tables based on data policies.

**Responsibilities**:
- Manages multiple SyncEngine instances (one per table)
- Only syncs tables configured for offline-first mode
- Coordinates sync across multiple tables
- Provides sync status per table

**Usage**:
```typescript
const manager = new SyncManager({ logger: console })
await manager.syncAll('connectivity-online')
await manager.syncTable('todos', 'manual')
```

## Data Flow

### Write Path (User Action)
```
User Action → Domain → Repository → Database (synced=0)
                                    ↓
                            Outbox (pending sync)
```

### Sync Path (Automatic)
```
Network Online → Coordinator → SyncEngine
                                  ↓
                          1. Drain Outbox
                             - Read unsynced (synced=0)
                             - Push to API (batch or individual)
                             - Mark as synced (synced=1)
                                  ↓
                          2. Drain Deletions
                             - Read deleted (deleted=1, synced=0)
                             - Delete from API
                             - Permanently delete locally
                                  ↓
                          3. Pull Remote Changes
                             - Get last sync timestamp
                             - Fetch changes since timestamp (incremental)
                             - Resolve conflicts
                             - Merge into database
                             - Update store
```

## Outbox Pattern

The sync layer uses an **embedded outbox pattern**:
- Local changes are marked with `synced=0` (outbox)
- Sync engine reads all items with `synced=0`
- After successful API push, marks as `synced=1`
- Deleted items are marked with `deleted=1, synced=0`
- After successful API delete, permanently removed

**Benefits**:
- Simple schema (no separate outbox table)
- Easy to query (just filter by `synced=0`)
- Automatic retry (unsynced items stay in outbox)
- Works offline (changes queued until online)

## Incremental Sync

The sync engine supports incremental sync:
- Tracks last sync timestamp in `sync_metadata` table
- On subsequent syncs, only fetches changes since last sync
- Falls back to full sync if incremental fails
- First sync always does full sync

**Benefits**:
- Reduces bandwidth (only fetches changes)
- Faster sync times
- Scales better with large datasets

## Conflict Resolution

When pulling remote changes, conflicts can occur if:
- Local item has unsynced changes (`synced=0`)
- Remote item has been updated

**Resolution Process**:
1. Detect conflict (local unsynced + remote updated)
2. Use conflict resolver with configured strategy
3. Default: `last-write-wins` (compare `updatedAt` timestamps)
4. Apply resolved version to database
5. Mark as synced if remote/resolved version wins

## Retry Strategy

### Current Implementation

**Retry is used for**:
- ✅ Individual todo creation (3 retries)
- ✅ Incremental sync (2 retries)
- ✅ Full sync (3 retries)

**Retry is NOT used for**:
- ❌ Batch operations (falls back to individual)
- ❌ Delete operations (no retry)

### Retry Behavior

- **Exponential backoff**: 1s → 2s → 4s → 8s (capped at 30s)
- **Retryable errors**: Network errors, timeouts, 5xx server errors, 429 rate limits
- **Non-retryable**: Client errors (4xx), validation errors
- **Max retries**: Configurable (default 3)

## Error Handling

### Sync-Level Errors
- Sync state tracked in `sync_metadata` table
- Errors logged with context
- Sync can be retried (coordinator will trigger again)
- Failed items remain in outbox for retry

### Operation-Level Errors
- Individual operations can fail without stopping entire sync
- Failed items logged but sync continues
- Retry logic handles transient network errors
- Permanent errors logged for debugging

## Integration

### With Domain Layer

The sync layer implements domain ports:
- `SyncPort`: Interface for sync operations
- `ConnectivityPort`: Interface for connectivity monitoring

### With Data Policies

Sync behavior is controlled by data policies:
- Only syncs tables with `syncMode: 'offline-first'`
- Respects `autoSync` flag
- Uses retention policies for cleanup

### With Repositories

Sync engine interacts with repositories:
- Reads unsynced items (`getUnsyncedTodos()`)
- Reads deleted items (`getDeletedTodos()`)
- Marks items as synced (`markAsSynced()`)
- Upserts remote changes (`upsertTodo()`)

## Testing

### Unit Tests
- Test retry logic with mock failures
- Test conflict resolution strategies
- Test connectivity adapter

### Integration Tests
- Test full sync flow
- Test incremental sync
- Test conflict resolution
- Test offline/online transitions

## Future Enhancements

1. **Dead-letter queue**: Store permanently failed operations
2. **Sync prioritization**: Prioritize user-initiated changes
3. **Jitter in backoff**: Prevent thundering herd
4. **Sync progress tracking**: Show progress to users
5. **Field-level conflict resolution**: Merge individual fields
6. **Sync queue**: Queue sync operations with priorities

## Files

- `capacitor-connectivity.adapter.ts` - Capacitor network adapter
- `sync-engine.ts` - Core sync engine (outbox pattern)
- `conflict-resolver.ts` - Conflict resolution strategies
- `retry-utils.ts` - Retry logic with exponential backoff
- `sync-manager.ts` - Multi-table sync orchestration
- `SYNC_ARCHITECTURE.md` - Architecture diagram (this file)

## Related Documentation

- See `../domain/config/data-policies.ts` for sync configuration
- See `../domain/services/online-offline-coordinator.ts` for coordination
- See `../db/sync-metadata/repo.ts` for sync state tracking
