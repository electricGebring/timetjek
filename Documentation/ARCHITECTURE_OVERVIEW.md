# Architecture overview

This document describes the application architecture, data flow, and the main decisions behind the offline-first sync design. It is intended to give readers a clear picture of how the system works without going into implementation detail.

---

## 1. High-level architecture

The app runs in the **browser** (web) or via **Capacitor** (iOS/Android). The **Vue application** is structured in layers:

- **UI**: Views and components (e.g. StaffRegister for time registration). User actions are handled here.
- **State**: **Pinia** stores hold reactive state (e.g. work entries, grouped entries). Views read from and dispatch actions to stores.
- **Domain**: Business logic lives in domain services (e.g. work-entries domain). Data policies define offline-first behaviour and retention; a **SyncTrigger** can start sync when a mutation happens (if online). A **Data Cleanup** service enforces TTL and daily cleanup.
- **Storage**: **Repositories** talk to the local database. On native we use **Capacitor SQLite**; on web we use **sql.js**. Tables include `work_entries` and `sync_metadata`. For type-safety and query building, we use **Drizzle ORM** (see "Data Access Layer & ORM" below).
- **Connectivity**: The **Capacitor Network API** reports online/offline. An **OnlineOfflineCoordinator** reacts to connectivity and starts or stops sync accordingly.
- **Sync**: A **SyncManager** runs one sync at a time and drives a **SyncEngine** per table. Each table has an **adapter** (e.g. work-entries) that knows how to talk to the repo, call the API, and merge remote data. **Retry** and **conflict resolution** are part of the sync layer. Conflict resolution **strategy is configurable per table** via data policies (e.g. last-write-wins, local-wins for drafts, remote-wins for server-authoritative data).
- **API / Backend**: API clients (e.g. work-entries.ts, workscheme.ts) call backend services (e.g. `/entries`, `/workScheme`).

So: **User → Vue → Pinia → Domain → Repositories → SQLite**, and when online, **Coordinator / SyncTrigger → SyncManager → SyncEngine → Adapters → API → Backend**.

---

### Data Access Layer & ORM

We use **Drizzle ORM** for type-safe database operations. The approach is **hybrid**:

- **Browser (web)**: Uses `sql.js` as the SQL execution engine. Drizzle schema provides TypeScript types for type-safety, but execution is sql.js-powered.
- **Node.js (backend, scripts, sync engines)**: Uses `better-sqlite3` as the SQL execution engine with Drizzle ORM for query building and type-safety.
- **Future backend API**: Will use Drizzle ORM with a production SQL database (PostgreSQL, MySQL, etc.).

**Why hybrid?**
- `sql.js` is the only viable in-browser SQL engine for offline-first apps (no network dependencies).
- Drizzle lets us write type-safe queries that work across both environments.
- Gradual adoption: We can expand Drizzle usage as the backend grows without refactoring app code.

**Current state:**
- Browser code uses sql.js-based repositories (e.g. `work-entry.read.ts`, `work-entry.upsert.ts`).
- Node.js scripts and future server logic use Drizzle ORM (e.g. `work-entry.read.drizzle.ts`, `work-entry.upsert.drizzle.ts`).
- All code is type-safe via Drizzle schema (`src/db/schema.ts`).

### Domain & Repository Integration

The **domain layer** (business logic) is decoupled from database implementation via the **repository pattern**:

- **Browser context** (`src/domain/work-entries/commands.ts`, `queries.ts`): Uses `repo.ts` which delegates to sql.js-based queries & commands.
- **Node.js context** (`src/domain/work-entries/work-entries.drizzle.ts`): Uses Drizzle ORM via the same repository for queries and commands in backend/sync/test contexts.

The domain layer has identical logic in both contexts; only the repository implementation changes. This allows:
1. **Type safety**: Both paths use Drizzle schema for type inference.
2. **Clear separation**: Domain logic is database-agnostic; repository layer handles dialect differences.
3. **Reusability**: Sync engine and backend logic can use the Drizzle versions; browser UI uses sql.js versions.

### Sync Engine Integration

The **sync engine** orchestrates bi-directional sync between local and remote databases:

- **Production adapter** (`src/sync/work-entries/adapter.ts`): Implements full sync with real API calls, aggregate support (work_entry + work_entry_breaks), conflict resolution, connectivity checks, and retry. Used by the app in browser/Capacitor.
- **Test mock** (`src/sync/work-entries/adapter.test-mock.ts`): Simulates API for Node.js sync tests (no HTTP). Uses the same repo; `fetchAll`/`fetchSince` return local data, `batchUpsert`/`batchDelete` update local state only. Do not use in production.

Both implement the same `TableSyncAdapter` interface:
- `getUnsynced()` - Fetch outbox entries (synced=0)
- `getDeleted()` - Fetch soft-deleted entries pending API deletion
- `batchUpsert(items)` - Push entries to API and mark as synced
- `batchDelete(ids)` - Delete entries from API and remove locally
- `markAsSynced(id)` - Mark single entry as synced after successful API push
- `permanentDelete(id)` - Hard delete after successful API deletion

**Sync workflow:**
1. Local mutations → outbox (synced=0)
2. Sync trigger → SyncEngine.start()
3. Drain outbox: `getUnsynced()` → `batchUpsert()` → `markAsSynced()`
4. Drain deletions: `getDeleted()` → `batchDelete()` → `permanentDelete()`
5. Pull remote: `fetchAll()` → `mergeRemote()` with conflict resolution

**Testing:**
- `npm run test:drizzle-domain` - Tests domain commands/queries with Drizzle
- `npm run test:sync-engine` - Tests sync adapter operations using the mock adapter (simulated API)

---

## 2. Data flow when data changes

When the user changes data (e.g. creates or deletes a work entry), the flow is:

1. **UI** – The Vue component (e.g. StaffRegister) handles the user action and dispatches a store action.
2. **State** – The Pinia store (e.g. useWorkEntriesStore) runs the action and calls the domain layer.
3. **Domain** – A domain use case (e.g. createWorkEntry, deleteWorkEntry) runs the business rules and then writes through the repository.
4. **Local persist** – The repository writes to SQLite. New or updated rows are stored with **synced = 0**, i.e. they go into the **outbox** (pending sync).
5. **Sync trigger** – If the app is online, a **SyncTrigger** (debounced) is notified after the mutation and starts a sync.
6. **Sync layer** – SyncManager runs syncAll(), which runs the SyncEngine for each synced table. The engine uses the table adapter to read unsynced items, call the API, and update local state.
7. **API & backend** – The adapter uses the API client to send POST/PATCH/DELETE/GET to the backend (e.g. `/entries`).
8. **After API success** – The adapter tells the repository to **markAsSynced** for successfully pushed items, or **permanentDelete** for successfully deleted items.

So: **mutation always hits local storage first**; sync to the backend happens as a separate step when online, triggered either by this SyncTrigger or by the coordinator when the device comes online.

---

## 3. Generic outbox pattern (offline storage)

The sync design follows a **generic outbox pattern** for offline-first storage:

- **Write path**: All writes go through application logic to a **local write** (insert/update). Items are **marked as unsynced** (outbox flag or queue). There is no “write directly to the server” path for these entities.
- **Local storage**: The local database has table(s) with a **synced flag** (or a dedicated outbox table). The set of rows with synced = 0 is the **outbox** (pending sync).
- **Connectivity**: A **network monitor** determines whether the device is online or offline.
- **Sync process (when online)**:
  1. **Trigger** – Sync is started by an online event, a periodic interval, or a manual call.
  2. **Drain outbox** – Read unsynced items, send them to the backend via the API, and on success mark them as synced (or remove from the outbox).
  3. **Drain deletions** (optional) – For soft-deleted items: delete on the API, then remove or finalise them locally.
  4. **Pull remote** (optional) – Fetch server changes, merge into the local DB, and resolve conflicts using a **per-table strategy** (from data policy: last-write-wins, local-wins, remote-wins, etc.).

**Decisions**: Local storage is the source of truth for writes. The app does not depend on the network for normal write operations. Sync is a background process that runs when online and brings local and server state in line.

---

## 4. Offline-first strategy

We adopt an **offline-first** strategy:

- **Principle**: Local storage is the source of truth. Writes always go to the local DB first. Sync to the backend happens when the device is online.
- **When offline**: User actions go through Store → Domain → Repository → SQLite. Changes are stored with synced = 0 (outbox). The app remains fully usable; no write is blocked by the network.
- **When online**: The same local-first write path applies. In addition, the **sync mechanism** runs: the **OnlineOfflineCoordinator** detects online, the **SyncManager** runs (one sync at a time), and for each table the engine (1) drains the outbox, (2) drains deletions, (3) pulls remote changes and merges using that table’s **conflict strategy** (from data policy: last-write-wins, local-wins, remote-wins, etc.).
- **Result**: When online, local and backend converge. When the user was offline, their changes are queued in the outbox and sync when they go back online.

**Decisions**: We prioritise availability and a smooth offline experience over strict real-time consistency. Conflict resolution (e.g. last-write-wins) and retry logic handle the rest.

---

## 5. Offline-to-online: what happens when the device comes online

When the device transitions from offline to online, the following sequence runs:

1. **Connectivity change** – The Capacitor Network API reports a status change and effectively emits an “online” event.
2. **Coordinator** – The **OnlineOfflineCoordinator** handles this (e.g. handleConnectivity(online)). It calls **sync.start('connectivity-online')**. If the device had gone offline instead, it would call sync.stop() and no sync would run.
3. **Sync adapter** – The SyncPort adapter (wrapping SyncManager) receives start and calls **syncManager.syncAll('connectivity-online')**.
4. **Per table** – For each table that is configured for sync (e.g. work_entries), the manager gets a SyncEngine and calls **engine.start(reason)**.
5. **SyncEngine steps** (in order):
   - Set **sync_metadata** for that table to “syncing”.
   - **Drain outbox**: getUnsynced(), send to API (createItem / batchUpsert), then markAsSynced() locally.
   - **Drain deletions**: getDeleted(), delete on API (deleteItem / batchDelete), then permanentDelete() locally.
   - **Pull remote**: fetchSince(lastSync) or fetchAll(), mergeRemote() per item with **per-table conflict strategy** (from data policy), then repo.upsert.
   - Call **markSyncSuccess()** in sync_metadata.
6. **Backend** – The API client sends POST/PATCH/DELETE/GET to the backend (e.g. /entries).
7. **Done** – When all steps complete, sync is idle and local and backend are in sync for that table.

**Decisions**: One sync run at a time (guard in SyncManager) to avoid overlapping syncs. Sync is triggered automatically on connectivity-online so the user does not have to manually “sync now”. Order of operations (outbox → deletions → pull) keeps local and remote consistent and avoids re-pushing items that were deleted on the server.

---

## Summary

- **Architecture**: Vue (UI) → Pinia (state) → Domain (logic, policies, SyncTrigger, cleanup) → Repositories → SQLite; Sync layer (Coordinator, SyncManager, SyncEngine, adapters) runs when online and uses API clients to talk to the backend.
- **Data flow**: Mutations go Component → Store → Domain → Repo → SQLite (outbox). SyncTrigger or Coordinator then drives SyncManager → Engine → Adapter → API → Backend; on success, repo marks synced or permanentDelete.
- **Pattern**: Generic outbox — always write locally and mark unsynced; when online, drain outbox (and deletions), optionally pull remote and merge.
- **Strategy**: Offline-first — local is source of truth; app works offline; sync when online.
- **Offline-to-online**: Connectivity event → Coordinator → SyncManager.syncAll() → per-table SyncEngine (drain outbox → drain deletions → pull remote) → API → backend; then sync idle.

This gives a consistent, understandable flow from user action through local storage and sync to the external APIs, with clear responsibilities and decision points.
