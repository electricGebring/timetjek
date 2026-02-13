/**
 * Business rules for staff register (pure where possible).
 * No I/O; receives data and returns decisions.
 */

import type { EntryWithTimes } from './types'

/**
 * True if the last entry (by order) has check-in but no check-out (open shift).
 */
export function hasOpenCheckIn(entries: EntryWithTimes[]): boolean {
  const last = [...entries].reverse().find((e) => e.check_in_at)
  return !!last && !last.check_out_at
}
