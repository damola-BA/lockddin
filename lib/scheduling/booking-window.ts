import { toZonedTime } from "date-fns-tz";
import type { BookingWindow } from "./types";

// Booking-window boundaries are CALENDAR boundaries in the provider's
// timezone, never rolling-day counts (F2): "current week" runs through
// Sunday; "3 months" = current month + the next two full months.

function localParts(instant: Date, timeZone: string) {
  const z = toZonedTime(instant, timeZone);
  return {
    year: z.getFullYear(),
    month: z.getMonth(),
    day: z.getDate(),
    weekday: z.getDay(), // 0=Sun..6=Sat
  };
}

function ymd(year: number, month: number, day: number): string {
  // month is 0-based; Date.UTC normalises overflow (e.g. day 32, month 13)
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/**
 * Inclusive last bookable local date ("YYYY-MM-DD") for a provider,
 * given the current instant.
 */
export function lastBookableDate(
  window: BookingWindow,
  now: Date,
  timeZone: string,
): string {
  const { year, month, day, weekday } = localParts(now, timeZone);
  switch (window) {
    case "3_days":
      // today + 2 (three calendar days including today)
      return ymd(year, month, day + 2);
    case "current_week": {
      const daysToSunday = weekday === 0 ? 0 : 7 - weekday;
      return ymd(year, month, day + daysToSunday);
    }
    case "current_month":
      return ymd(year, month + 1, 0); // day 0 of next month = last of this
    case "3_months":
      return ymd(year, month + 3, 0); // current + next two full months
  }
}

/** Is the local date within [today, lastBookableDate]? */
export function isDateBookable(
  date: string,
  window: BookingWindow,
  now: Date,
  timeZone: string,
): boolean {
  const { year, month, day } = localParts(now, timeZone);
  const today = ymd(year, month, day);
  return date >= today && date <= lastBookableDate(window, now, timeZone);
}

/** Is the local date before today (in the provider's timezone)? The only
 *  horizon floor that applies to flexible providers — their booking window is
 *  the set of dates they've explicitly opened, not a relative range. */
export function isDateInPast(date: string, now: Date, timeZone: string): boolean {
  const { year, month, day } = localParts(now, timeZone);
  return date < ymd(year, month, day);
}
