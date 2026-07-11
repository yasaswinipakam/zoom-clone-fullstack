/**
 * Utilities for parsing and formatting meeting codes.
 * Backend format: "847-2910-556" (3 groups separated by hyphens)
 */

/** Extract a meeting code from a raw string (code or invite URL) */
export function parseMeetingCode(raw: string): string {
  const trimmed = raw.trim();

  // Try to extract from a URL path like /meeting/847-2910-556 or /j/8472910556
  const urlMatch = trimmed.match(/\/(?:meeting|j)\/([0-9-]{9,13})/i);
  if (urlMatch) {
    return normalizeMeetingCode(urlMatch[1]);
  }

  // Strip all non-digit characters and reformat
  return normalizeMeetingCode(trimmed);
}

/** Normalize digits-only or hyphenated code to "xxx-xxxx-xxx" format */
export function normalizeMeetingCode(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return raw.trim();

  // Format as "xxx-xxxx-xxx" if we have ~10 digits
  if (digits.length >= 9 && digits.length <= 11) {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 7);
    const c = digits.slice(7);
    return `${a}-${b}-${c}`;
  }

  // Return as-is (already hyphenated, or unusual format)
  return raw.trim();
}

/** Check if a string looks like it could be a valid meeting code */
export function looksLikeMeetingCode(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 11;
}
