# ID Strategy: Local vs Remote IDs and Multi-Device Sync

This document describes the ID model used for work entries and breaks to support multi-device sync (Option B + Option C from the strategy plan).

## Target Model

| Field       | Purpose                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `id`        | Local primary key (client-generated UUID). Preserved across sync.       |
| `remote_id` | Server-assigned ID when synced. Populate after push; match on pull.     |
| `device_id` | Device/origin identifier for attribution and future conflict handling.  |

## Create Flow

- Generate `id` via `createLocalWorkEntryId()` (UUID v4).
- Set `device_id` via `getDeviceId()` (stable per device, stored in localStorage).
- Leave `remote_id` null until first successful push.

## Push Flow

- Send entry with `local_id` = local `id`; API generates server ID.
- API returns `entry.id` = server ID; response includes `breakIdMap` for local → remote break IDs.
- Client persists `remote_id` = server ID on entry and breaks.

## Pull Flow

- **Match rule**: Match by `remote_id` when present; else by `id` for backward compatibility.
- New remote rows: insert with `id` = server id, `remote_id` = server id (pulled-only rows).
- For client-created-then-synced rows: `id` = local uuid, `remote_id` = server id.

## Conflict Resolution (Phase 2)

- Use `device_id` + `updatedAt` for smarter merge (e.g. prefer newer or device priority).
- Currently: last-write-wins.

## Schema

- **work_entries**: `remote_id`, `device_id` (both nullable).
- **work_entry_breaks**: `remote_id`, `device_id` (both nullable).
