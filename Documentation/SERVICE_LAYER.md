# Service Layer Reference

**File:** `src/domain/work-entries/service.ts`

Exponerad på `window.workEntriesService` under development för console-debugging.

---

## API-referens

### `getWorkHistory(days?)`

Hämta arbetshistorik, senaste N dagar (default 30).

```javascript
await window.workEntriesService.getWorkHistory()
await window.workEntriesService.getWorkHistory(7)
```

Returns: `Array<WorkEntry>` sorterad nyaste först

---

### `getCurrentStatus()`

Aktuell status — instämplad eller ej, timmar idag.

```javascript
await window.workEntriesService.getCurrentStatus()
```

Returns: 
```javascript
{ isClockedIn: boolean, currentEntry: WorkEntry | null, hoursToday: number }
```

---

### `getEntriesForDate(date)`

Alla entries för ett specifikt datum (YYYY-MM-DD).

```javascript
await window.workEntriesService.getEntriesForDate("2026-02-09")
```

---

### `getPendingSyncOperations()`

Vad som väntar på synk (outbox-kö).

```javascript
await window.workEntriesService.getPendingSyncOperations()
```

Returns:
```javascript
[{ id, type: 'INSERT'|'UPDATE'|'DELETE', payload: JSON, created_at }, ...]
```

---

### `clearAllData()`

⚠️ Rensa all lokal data.

```javascript
await window.workEntriesService.clearAllData()

---

## Test-scenarier

**Test 1: Offline-status**
```javascript
// Stämpla in, koppla bort internet
const pending = await window.workEntriesService.getPendingSyncOperations()
console.log('Väntar på synk:', pending.length, 'operationer')
```

**Test 2: Persistence efter restart**
```javascript
// Efter page reload (F5)
const history = await window.workEntriesService.getWorkHistory()
console.log('Data fanns kvar:', history.length, 'entries') // ✓ om >0
```

**Test 3: Aktuell status**
```javascript
const status = await window.workEntriesService.getCurrentStatus()
console.log('Instämplad?', status.isClockedIn)
console.log('Timmar idag:', status.hoursToday)
```

**Test 4: Specifikt datum**
```javascript
const todayEntries = await window.workEntriesService.getEntriesForDate("2026-02-09")
console.log('Idag skapade:', todayEntries.length, 'entries')
```

---

## Exponering på window

Service-lagret är automatiskt exponerat på `window.workEntriesService` under development:

```javascript
window.workEntriesService = {
  getWorkHistory,
  getCurrentStatus,
  getEntriesForDate,
  getPendingSyncOperations,
  clearAllData,
}
```

**Kontrollera i konsol:**
```javascript
console.log(window.workEntriesService)
// → Object { getWorkHistory: ƒ, getCurrentStatus: ƒ, ... }
```

---

## Relaterad dokumentation

- [SQLITE_SCHEMA.md](SQLITE_SCHEMA.md) — Database schema och queries
- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) — System overview
- [OFFLINE_FIRST.md](OFFLINE_FIRST.md) — Offline-first strategi

---

**Senast uppdaterad:** 2026-02-09
**Service Layer Version:** 1.0
