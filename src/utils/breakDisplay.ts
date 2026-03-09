import type { Entry } from '@/views/staffRegister/types'
import type { WorkEntryBreak } from '@/models/work-entry-break.schema'

function isoToLocalTimeString(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * Build break display string for UI (e.g. "09:30:00-10:00:00" or "09:30:00-" for open break).
 * Uses work_entry_breaks as source of truth.
 */
export function buildBreakDisplayString(entry: Entry, breaks: WorkEntryBreak[]): string | null {
  // work_entry_breaks is source of truth; never fall back to entry.break (can be stale from API)
  if (!breaks.length) return null

  const openBreak = breaks.find((b) => !b.end_at)
  if (openBreak && !entry.check_out_at) {
    const start = openBreak.start_exact_at ?? openBreak.start_at
    const timePart = isoToLocalTimeString(start)
    return timePart ? `${timePart}-` : null
  }

  const first = breaks.find((b) => b.start_at && b.end_at)
  if (!first) return null
  const startTime = isoToLocalTimeString(first.start_exact_at ?? first.start_at)
  const endTime = isoToLocalTimeString(first.end_exact_at ?? first.end_at)
  return startTime && endTime ? `${startTime}-${endTime}` : null
}
