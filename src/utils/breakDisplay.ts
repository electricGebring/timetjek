import type { Entry } from '@/views/staffRegister/types'

import type { WorkEntryBreak } from '@/models/work-entry-break.schema'

function isoToLocalTimeString(iso: string | null): string | null {
  if (!iso) return null

  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return null

  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * Whether any break is open (has no end_at).
 * User is on break when hasOpenBreak(breaks) && !entry.check_out_at.
 */
export function hasOpenBreak(breaks: WorkEntryBreak[]): boolean {
  return breaks.some((b) => !b.end_at)
}

/**
 * Build break display string for UI, formatting ALL breaks.
 * Closed: "HH:MM-HH:MM", open: "HH:MM-". Joined with ", ".
 * E.g. "09:30-10:00, 11:00-11:30" or "09:30-10:00, 11:30-"
 */
export function buildBreakDisplayString(entry: Entry, breaks: WorkEntryBreak[]): string | null {
  if (!breaks.length) return null

  const sorted = [...breaks].sort((a, b) => {
    const sa = a.start_exact_at ?? a.start_at ?? ''

    const sb = b.start_exact_at ?? b.start_at ?? ''

    return sa.localeCompare(sb)
  })

  const segments: string[] = []

  for (const b of sorted) {
    const start = isoToLocalTimeString(b.start_exact_at ?? b.start_at)

    if (!start) continue

    if (!b.end_at && !entry.check_out_at) {
      segments.push(`${start}-`)
    }

    else if (b.end_at) {
      const end = isoToLocalTimeString(b.end_exact_at ?? b.end_at)

      if (end) segments.push(`${start}-${end}`)
    }
  }

  return segments.length > 0 ? segments.join(', ') : null
}
