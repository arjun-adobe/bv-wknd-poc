/*
 * Event display formatting, shared by the event block (event page) and the
 * event-cards block (events listing) so both show dates and prices the same way.
 */

export const EVENTS_PATH = '/us/en/events';

/** "2026-11-14" -> Date at UTC midnight (event dates are calendar days), or null. */
export function parseDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 2026-11-14 -> "Sat, 14 Nov 2026" (formatted in UTC so the day never shifts). */
export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return value || '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
}

/** 25 -> "$25", 0 -> "Free"; accepts numbers or numeric strings (index values). */
export function formatPrice(price, currency = 'USD') {
  if (price === undefined || price === null || price === '') return '';
  const value = Number(price);
  if (Number.isNaN(value)) return String(price);
  if (value === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency || 'USD', maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

/** True when the event's date is today or later (UTC calendar day). */
export function isUpcoming(value, now = new Date()) {
  const date = parseDate(value);
  if (!date) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return date.getTime() >= today;
}
