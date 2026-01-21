# SyncManager Usage

## Current Status

**`SyncManager.syncAll()` is NOT currently being triggered.**

The application currently uses `SyncEngine` directly through the `OnlineOfflineCoordinator`.

## Current Flow

```
Network Online 
  → OnlineOfflineCoordinator.handleConnectivity()
  → coordinator.deps.sync.start('connectivity-online')
  → SyncEngine.start()  ← Currently used
```

**In `main.ts`:**
```typescript
const syncEngine = new SyncEngine({ logger: console })

const coordinator = new OnlineOfflineCoordinator({
  connectivity,
  sync: syncEngine,  // ← Direct SyncEngine, not SyncManager
  logger: console,
})
```

## When SyncManager Would Be Triggered

If `SyncManager` were integrated, `syncAll()` would be triggered:

1. **By OnlineOfflineCoordinator** when connectivity changes to online
2. **Manually** by calling `manager.syncAll('manual')`
3. **On app resume** (if implemented)
4. **Periodically** (if interval sync is implemented)

## How to Integrate SyncManager

To use `SyncManager` instead of direct `SyncEngine`, update `main.ts`:

```typescript
import { SyncManager } from './sync/sync-manager'

// Replace SyncEngine with SyncManager
const syncManager = new SyncManager({ logger: console })

// Create a SyncPort adapter that uses SyncManager
const syncPortAdapter: SyncPort = {
  async start(reason: SyncReason) {
    await syncManager.syncAll(reason)
  },
  async stop() {
    await syncManager.stopAll()
  },
  isRunning() {
    return syncManager.isAnyRunning()
  },
}

const coordinator = new OnlineOfflineCoordinator({
  connectivity,
  sync: syncPortAdapter,  // ← Use adapter instead
  logger: console,
})
```

## Benefits of Using SyncManager

1. **Multi-table support**: Syncs all configured tables automatically
2. **Policy-based**: Only syncs tables with `offline-first` mode
3. **Parallel sync**: Can sync multiple tables concurrently
4. **Better organization**: Separates single-table vs multi-table concerns

## Current Limitation

The current `SyncEngine` is hardcoded to sync only the `todos` table. To support multiple tables, you would need to either:

1. **Use SyncManager** (recommended for multi-table)
2. **Make SyncEngine table-agnostic** (refactor to accept table name)

## Recommendation

If you only have one table (`todos`), the current setup is fine. If you plan to add more tables, integrate `SyncManager` as shown above.
