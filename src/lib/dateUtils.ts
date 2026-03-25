/**
 * Safely parse a date string, returning null if invalid.
 * Accepts ISO date strings (YYYY-MM-DD), ISO timestamps, or Date objects.
 */
export function safeParseDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string' || value.trim() === '') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}
