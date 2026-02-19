/**
 * Formats minutes into a human-readable string showing hours and minutes
 * @param totalMinutes - The total number of minutes to format
 * @returns Formatted string like "1 tim 30 min", "45 min", or "2 tim"
 */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)

  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours} tim ${minutes} min`
  } else if (hours > 0) {
    return `${hours} tim`
  } else {
    return `${minutes} min`
  }
}
