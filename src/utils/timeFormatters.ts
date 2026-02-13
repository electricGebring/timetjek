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

export function formatBreak(breakValue: string | null): string {
  if (!breakValue) return '—'
  const parts = breakValue.split('-')
  if (parts.length !== 2) {
    return '—'
  }
  const start = parts[0]
  const end = parts[1]
  if (!start || !end) return '—'
  if (end === '00:00:00') {
    return '—'
  }
  const startParts = start.split(':').map(Number)
  const endParts = end.split(':').map(Number)
  const startH = startParts[0] ?? 0
  const startM = startParts[1] ?? 0
  const startS = startParts[2] ?? 0
  const endH = endParts[0] ?? 0
  const endM = endParts[1] ?? 0
  const endS = endParts[2] ?? 0
  const startMinutes = startH * 60 + startM + startS / 60
  const endMinutes = endH * 60 + endM + endS / 60
  const durationMinutes = Math.round(endMinutes - startMinutes)
  if (durationMinutes < 60) {
    return `${durationMinutes}min`
  }
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes}min`
}
