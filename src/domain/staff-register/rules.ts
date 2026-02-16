import type { EntryWithTimes } from './types'

export function hasOpenCheckIn(entries: EntryWithTimes[]): boolean {
  const last = [...entries].reverse().find((e) => e.check_in_at)
  return !!last && !last.check_out_at
}
