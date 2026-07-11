/**
 * Meeting code utilities — pure functions, no React, no network.
 *
 * Constitution §5.3: "lib/ contains only pure functions with no React
 * import and no network call."
 *
 * The backend generates meeting codes in the format "NNN-NNNN-NNN"
 * (three groups of digits, separated by hyphens — e.g. "847-2910-556").
 * Reference: backend/app/core/constants.py — MEETING_CODE_SEGMENT_LENGTHS = (3, 4, 3)
 */

/** Regex matching the backend's meeting code format: "NNN-NNNN-NNN" */
const MEETING_CODE_PATTERN = /^\d{3}-\d{4}-\d{3}$/

/**
 * Returns true if `value` matches the backend's meeting code format.
 * Used for client-side validation before making a GET /meetings/code/{code} call.
 */
export function isValidMeetingCode(value: string): boolean {
  return MEETING_CODE_PATTERN.test(value.trim())
}

/**
 * Extracts a meeting code from either a raw code or a full invite URL.
 *
 * Accepts:
 *   - "847-2910-556"                              → "847-2910-556"
 *   - "http://localhost:3000/meeting/847-2910-556" → "847-2910-556"
 *   - "/meeting/847-2910-556"                     → "847-2910-556"
 *
 * Returns null if no valid code can be extracted.
 */
export function extractMeetingCode(input: string): string | null {
  const trimmed = input.trim()

  // Direct code match
  if (isValidMeetingCode(trimmed)) return trimmed

  // Try to extract from a URL path segment
  const match = trimmed.match(/\/meeting\/(\d{3}-\d{4}-\d{3})/)
  if (match) return match[1]

  return null
}
