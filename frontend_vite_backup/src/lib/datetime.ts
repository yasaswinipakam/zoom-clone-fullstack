/**
 * Date/time utilities — pure functions, no React, no network.
 *
 * Constitution §5.3: "lib/ contains only pure functions with no React
 * import and no network call."
 *
 * Responsibilities:
 *  - Formatting UTC ISO 8601 strings from the backend into locale-appropriate
 *    display strings (no moment.js — built-in Intl API is sufficient).
 *  - Combining separate date/time UI field values into a single UTC ISO string
 *    for the ScheduleMeetingForm before submission.
 */

/**
 * Formats a UTC ISO 8601 string into a human-readable local date + time.
 * Example: "2026-08-01T14:00:00Z" → "Aug 1, 2026, 2:00 PM"
 */
export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoString))
}

/**
 * Formats a UTC ISO 8601 string into a date-only display string.
 * Example: "2026-08-01T14:00:00Z" → "Aug 1, 2026"
 */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoString))
}

/**
 * Formats a duration in minutes into a human-readable string.
 * Example: 75 → "1h 15m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Combines a local date string ("YYYY-MM-DD") and time string ("HH:MM")
 * from form inputs into a UTC ISO 8601 string suitable for submission.
 * The input is treated as local time and converted to UTC.
 */
export function localDateTimeToUtcIso(date: string, time: string): string {
  const localDate = new Date(`${date}T${time}`)
  return localDate.toISOString()
}

/**
 * Returns true if the given ISO date string is in the future.
 * Used for client-side Zod validation of scheduled_at.
 */
export function isFutureDateTime(isoString: string): boolean {
  return new Date(isoString) > new Date()
}
