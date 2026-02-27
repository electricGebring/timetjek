# Sync Flow in main.ts

## Overview

The system syncs data with the API based on connectivity and user actions. An **OnlineOfflineCoordinator** listens to **connectivity** and drives **sync**.

---

## Components

### 1. `CapacitorConnectivityAdapter` (connectivity)

- Uses Capacitor's `Network` API
- `getCurrent()` – returns current network status
- `subscribe()` – subscribes to `networkStatusChange` (online/offline)

### 2. `SyncManager` wrapped by `syncAdapter`

- `syncAdapter` implements `SyncPort` and delegates to `SyncManager`
- `start(reason)` → `syncManager.syncAll(reason)`
- `stop()` → `syncManager.stopAll()`
- `isRunning()` → `syncManager.isAnyRunning()`

### 3. `OnlineOfflineCoordinator`

- Receives `connectivity` and `sync`
- On `coordinator.start()` (line 92):
  1. Gets current status with `connectivity.getCurrent()`
  2. Handles it immediately via `handleConnectivity(current)`
  3. Subscribes to `connectivity.subscribe()` for future changes

---

## What Triggers What

| Trigger | Source | Result |
|---------|--------|--------|
| **Online** | Capacitor `networkStatusChange` | `connectivity.subscribe()` → `handleConnectivity(state)` → `sync.start('connectivity-online')` |
| **Offline** | Same event | `handleConnectivity` → `sync.stop()` |
| **App startup** | `coordinator.start()` | Uses `getCurrent()`; if online → `sync.start('connectivity-online')` |
| **Manual sync** | `syncAdapter.start('manual')` (e.g. line 101) | Direct sync |
| **Mutation** | `initSyncTrigger` + `triggerSyncIfOnline('mutation')` | If online and no sync running: debounced sync |

---

## Flow Diagram

```
Capacitor Network API
        │
        │ networkStatusChange
        ▼
CapacitorConnectivityAdapter.subscribe()
        │
        │ (state: { online: boolean })
        ▼
OnlineOfflineCoordinator.handleConnectivity(state)
        │
        ├── online?  → sync.start('connectivity-online')
        │             (syncIntervalMs? → startPeriodicSync)
        │
        └── offline? → sync.stop()
                       stopPeriodicSync()
        │
        ▼
syncAdapter (SyncPort)
        │
        ▼
SyncManager.syncAll(reason)
```

---

## Parallel Trigger: `initSyncTrigger`

`initSyncTrigger(syncAdapter, connectivity)` (line 89) wires domain mutations to sync:

- Domain code can call `triggerSyncIfOnline('mutation')` after mutations
- It checks connectivity, debounces calls, and starts sync when online and no sync is running

The coordinator handles connectivity changes; the sync trigger handles mutation-driven sync.
