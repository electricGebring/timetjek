// Utils for formatting time, work time, and breaks

export function formatTime(isoDateTime: string | null): string {
  if (!isoDateTime) return '—'

  const date = new Date(isoDateTime)

  const parts = date.toISOString().split('T')

  const timePart = parts[1]

  if (!timePart) return '—'

  const fullTime = timePart.split('.')[0] || '—'

  return fullTime.substring(0, 5) // HH:MM only
}

export function formatWorkTime(seconds: number | null): string {
  if (!seconds) return '—'

  const hours = Math.floor(seconds / 3600)

  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`

  if (hours > 0) return `${hours}h`

  return `${minutes}min`
}

function formatDurationMinutes(durationMinutes: number): string {
  if (durationMinutes < 60) return `${durationMinutes}min`
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

/** Parse "HH:MM:SS" or "HH:MM" to minutes since midnight */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const s = parts[2] ?? 0
  return h * 60 + m + s / 60
}

/** Duration in minutes for one segment ("start-end" or "start-") */
function segmentDurationMinutes(segment: string): number | null {
  const dashIdx = segment.indexOf('-')
  if (dashIdx < 0) return null

  const start = segment.slice(0, dashIdx).trim()
  const end = segment.slice(dashIdx + 1).trim()

  if (!start) return null

  const startMinutes = parseTimeToMinutes(start)

  if (!end) {
    // Open break: duration from start to now
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
    return Math.max(0, Math.round(nowMinutes - startMinutes))
  }

  if (end === '00:00' || end === '00:00:00') return null

  const endMinutes = parseTimeToMinutes(end)
  return Math.round(endMinutes - startMinutes)
}

/**
 * Format break display string to total duration.
 * Handles comma-separated segments, e.g. "09:30-10:00, 11:00-11:30".
 * Open segments ("HH:MM-") use current time as end.
 */
export function formatBreak(breakValue: string | null): string {
  if (!breakValue) return '—'

  const segments = breakValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  let totalMinutes = 0

  for (const seg of segments) {
    const d = segmentDurationMinutes(seg)
    if (d !== null && d > 0) totalMinutes += d
  }

  if (totalMinutes <= 0) return '—'

  return formatDurationMinutes(totalMinutes)
}
