import type { IsoDate } from "./types";

/**
 * All date maths runs in UTC. Ireland observes DST, and doing calendar
 * arithmetic in local time introduces hour-level drift that can flip a
 * "90 days' notice" check on the boundary.
 */

export function parseIso(date: IsoDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${date}`);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Adds months, clamping to the end of the target month.
 *
 * JavaScript's native `setMonth` overflows instead of clamping: 31 January
 * plus one month lands on 3 March, not 28 February. That is wrong for legal
 * date arithmetic and it silently corrupts the elapsed-period calculation for
 * any rent set on the 29th, 30th or 31st of a month — which is a lot of rents.
 */
export function addMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;

  // Day 0 of the following month is the last day of the month we want.
  const lastDayOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTarget)));
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Elapsed period expressed in months, including a fractional part.
 *
 * Section 19(4) of the 2004 Act (as inserted by the Residential Tenancies
 * (Amendment) Act 2021) sets the percentage limb as:
 *
 *   "2 per cent of the old rent in respect of each year that has elapsed
 *    since the previous setting, and ... such percentage as bears to 2 per
 *    cent the same proportion that that period bears to a year"
 *
 * So the allowance is strictly proportional to elapsed time, not rounded to
 * whole years. We count whole calendar months first and then apportion the
 * remainder across the length of the month it falls in, which keeps the result
 * stable regardless of month length.
 */
export function elapsedMonths(from: Date, to: Date): number {
  if (to <= from) return 0;

  let whole =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());

  let anchor = addMonths(from, whole);
  if (anchor > to) {
    whole -= 1;
    anchor = addMonths(from, whole);
  }

  const nextAnchor = addMonths(from, whole + 1);
  const span = nextAnchor.getTime() - anchor.getTime();
  const fraction = span > 0 ? (to.getTime() - anchor.getTime()) / span : 0;

  return whole + fraction;
}

/** "YYYY-MM" for the month immediately preceding the given date. */
export function precedingMonthKey(date: Date): string {
  const prev = addMonths(date, -1);
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatIrishDate(date: IsoDate | Date): string {
  const d = typeof date === "string" ? parseIso(date) : date;
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
