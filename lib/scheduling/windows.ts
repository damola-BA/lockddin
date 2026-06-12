import { fromZonedTime } from "date-fns-tz";
import type { DayOverride, TemplateDay, TimeBlock } from "./types";

// Window building (F4 steps 3+5): working hours minus recurring reserved
// blocks minus one-off override blocks. Local "HH:MM" math happens on the
// minute grid; conversion to UTC instants happens once per boundary via
// date-fns-tz (hard rule 1: never do timezone math by hand).

export interface LocalWindow {
  startMin: number; // minutes since local midnight
  endMin: number;
}

export interface UtcRange {
  start: Date;
  end: Date;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** The provider's working hours for a local date, after the override fork. */
export function effectiveHours(
  templateDay: TemplateDay | null,
  override: DayOverride | null,
): { start: number; end: number } | null {
  if (override?.kind === "closed") return null;
  if (override?.kind === "open" || override?.kind === "modified") {
    if (!override.start || !override.end) return null;
    return { start: toMinutes(override.start), end: toMinutes(override.end) };
  }
  if (!templateDay) return null;
  return { start: toMinutes(templateDay.start), end: toMinutes(templateDay.end) };
}

/** Subtract blocks from working hours → candidate windows on the minute grid. */
export function buildLocalWindows(
  hours: { start: number; end: number },
  blocks: TimeBlock[],
): LocalWindow[] {
  const sorted = blocks
    .map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const windows: LocalWindow[] = [];
  let cursor = hours.start;
  for (const block of sorted) {
    if (block.end <= hours.start || block.start >= hours.end) continue;
    if (block.start > cursor) {
      windows.push({ startMin: cursor, endMin: Math.min(block.start, hours.end) });
    }
    cursor = Math.max(cursor, block.end);
    if (cursor >= hours.end) break;
  }
  if (cursor < hours.end) windows.push({ startMin: cursor, endMin: hours.end });
  return windows.filter((w) => w.endMin > w.startMin);
}

/**
 * Convert a local window to a UTC range. Each boundary converts
 * independently, so on DST days the range's real length differs from its
 * face value — which is exactly what the slot walk needs.
 */
export function toUtcRange(
  date: string,
  window: LocalWindow,
  timeZone: string,
): UtcRange {
  return {
    start: localInstant(date, window.startMin, timeZone),
    end: localInstant(date, window.endMin, timeZone),
  };
}

export function localInstant(
  date: string,
  minutes: number,
  timeZone: string,
): Date {
  // Roll day overflow forward: fromZonedTime silently reads "T24:00:00" as
  // 00:00 of the SAME day, which once collapsed the availability loader's
  // day window to zero width and hid every booking from the engine.
  const dayOffset = Math.floor(minutes / 1440);
  const rem = ((minutes % 1440) + 1440) % 1440;
  let day = date;
  if (dayOffset !== 0) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    day = d.toISOString().slice(0, 10);
  }
  const h = String(Math.floor(rem / 60)).padStart(2, "0");
  const m = String(rem % 60).padStart(2, "0");
  return fromZonedTime(`${day}T${h}:${m}:00`, timeZone);
}
