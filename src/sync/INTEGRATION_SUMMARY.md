# SyncManager Integration Summary

## ✅ Implementation Complete

The `SyncManager` is now properly integrated with `SyncEngine` and will be triggered automatically when connectivity changes.

## What Changed

### 1. **Table Sync Adapter** (`table-sync-adapter.ts`)
- Created adapter pattern to make `SyncEngine` table-agnostic
- Provides table-specific operations (repo, API, domain merge)
- Currently supports `todos` table
- Extensible for future tables

### 2. **SyncEngine Refactored**
- Now accepts `tableName` and `adapter` in constructor
- All operations use adapter instead of hardcoded `todos` imports
- Fully table-agnostic
- Works with any table that has an adapter

### 3. **SyncManager Integration**
- Creates `SyncEngine` instances per table
- Uses table adapters to configure each engine
- Only syncs tables configured for `offline-first` mode
- Manages multiple sync engines

### 4. **Main.ts Updated**
- Uses `SyncManager` instead of direct `SyncEngine`
- Creates `SyncPort` adapter that wraps `SyncManager`
- Coordinator triggers `syncManager.syncAll()` when online

## Flow

```
Network Online
  → OnlineOfflineCoordinator.handleConnectivity()
  → syncAdapter.start('connectivity-online')
  → syncManager.syncAll('connectivity-online')
  → For each table in data policies:
      → getSyncEngine(tableName)
      → syncEngine.start('connectivity-online')
      → Uses table adapter for all operations
```

## When `syncAll()` is Triggered

1. **Automatically**: When connectivity changes to online
   - Via `OnlineOfflineCoordinator`
   - Reason: `'connectivity-online'`

2. **Manually**: Can be called directly
   ```typescript
   await syncManager.syncAll('manual')
   ```

3. **Per Table**: Can sync individual tables
   ```typescript
   await syncManager.syncTable('todos', 'manual')
   ```

## Adding New Tables

To add a new table:

1. **Create adapter** in `table-sync-adapter.ts`:
   ```typescript
   export function createNewTableAdapter(): TableSyncAdapter {
     return {
       tableName: 'new_table',
       getUnsynced: async () => { /* ... */ },
       // ... implement all adapter methods
     }
   }
   ```

2. **Register adapter**:
   ```typescript
   registerTableAdapter('new_table', createNewTableAdapter)
   ```

3. **Add to data policies**:
   ```typescript
   new_table: {
     tableName: 'new_table',
     syncMode: 'offline-first',
     retentionDays: 30,
     autoSync: true,
   }
   ```

4. **SyncManager will automatically sync it** when online!

## Benefits

✅ **Multi-table support**: Syncs all configured tables
✅ **Policy-based**: Only syncs tables with `offline-first` mode
✅ **Extensible**: Easy to add new tables
✅ **Table-agnostic**: SyncEngine works with any table
✅ **Automatic**: Triggers on connectivity changes

## Testing

The integration is ready to use. When you go online:
- `SyncManager.syncAll()` will be called
- It will sync all tables in `DATA_POLICIES` with `offline-first` mode
- Currently only `todos` table is configured, so it will sync todos
