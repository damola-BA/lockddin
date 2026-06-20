import type { AvailabilityInput, OccupiedRange, Slot } from "./types";
import { isDateBookable, isDateInPast } from "./booking-window";
import { buildLocalWindows, effectiveHours, toUtcRange } from "./windows";

// The 8-step availability algorithm (F4) as a pure, deterministic function.
// No I/O: confirmed bookings + active holds arrive pre-fetched in the input
// (the caller performs the single injected DB read, step 6).

const MS = 60_000;

export function getAvailableSlots(input: AvailabilityInput): Slot[] {
  const { provider, service, date, now, templateDay, override, occupied } = input;

  // Step 0 — horizon. Regular providers are bounded by the relative booking
  // window ("how far ahead can people book?"). Flexible providers set their own
  // horizon by the specific dates they open, so the window doesn't apply to them
  // — only the floor that you can't book a date in the past.
  if (provider.scheduleType === "flexible") {
    if (isDateInPast(date, now, provider.timezone)) return [];
  } else if (!isDateBookable(date, provider.bookingWindow, now, provider.timezone)) {
    return [];
  }

  // Flexible mode skips the template entirely: only kind='open' override
  // dates are available.
  if (provider.scheduleType === "flexible" && override?.kind !== "open") {
    return [];
  }

  // Step 1 — availability: is this service allowed on this day?
  // Service restrictions are a template-day feature; override-driven days
  // (open/modified hours) inherit the template day's restriction if one
  // exists, and allow all services otherwise.
  if (templateDay?.serviceIds && !templateDay.serviceIds.includes(service.id)) {
    return [];
  }

  // Step 2 — capacity: daily cap reached by confirmed bookings → stop.
  // (The fetch already happened, so the count is free.)
  const cap = override?.dailyCap ?? templateDay?.dailyCap ?? null;
  if (cap !== null && occupied.confirmedBookings.length >= cap) {
    return [];
  }

  const bufferMinutes = service.bufferMinutes ?? provider.globalBufferMinutes;
  const neededMinutes = service.durationMinutes + bufferMinutes;

  // Steps 3+5 — build candidate windows (working hours − recurring blocks
  // − one-off blocks) and keep only windows that can mathematically fit
  // duration + buffer.
  const hours = effectiveHours(templateDay, override);
  if (!hours) return [];

  const reserved = override?.kind === "open" ? [] : (templateDay?.reservedBlocks ?? []);
  const blocks = [...reserved, ...(override?.extraBlocks ?? [])];
  const windows = buildLocalWindows(hours, blocks).filter(
    (w) => w.endMin - w.startMin >= neededMinutes,
  );
  if (windows.length === 0) return []; // step 3 fail: nothing can fit

  // Step 4 — lead time boundary: hide slots starting before now + lead.
  const leadBoundary = new Date(now.getTime() + provider.minLeadTimeMinutes * MS);

  // Step 6 — merge confirmed bookings + active holds into occupied ranges.
  const ranges: OccupiedRange[] = [
    ...occupied.confirmedBookings,
    ...occupied.activeHolds,
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  // Step 7 — walk the gaps. Each gap yields back-to-back starts anchored
  // at the gap start and stepped by duration + buffer (DD24): clients see
  // every bookable time, and because steps are exact service lengths no
  // dead fragments form. Still no 15-minute subdivision. All math in UTC
  // ms so DST days stay 60/90-minute-accurate.
  const slots: Slot[] = [];
  for (const window of windows) {
    const range = toUtcRange(date, window, provider.timezone);
    let cursor = range.start.getTime();
    const windowEnd = range.end.getTime();

    const overlapping = ranges.filter(
      (r) => r.effectiveEndAt.getTime() > cursor && r.startsAt.getTime() < windowEnd,
    );

    for (const occ of overlapping) {
      pushGapSlots(cursor, occ.startsAt.getTime());
      cursor = Math.max(cursor, occ.effectiveEndAt.getTime());
      if (cursor >= windowEnd) break;
    }
    pushGapSlots(cursor, windowEnd);

    function pushGapSlots(gapStart: number, gapEnd: number) {
      const clippedEnd = Math.min(gapEnd, windowEnd);
      const needed = neededMinutes * MS;
      for (let t = gapStart; t + needed <= clippedEnd; t += needed) {
        if (t < leadBoundary.getTime()) continue; // step 4
        slots.push({
          startsAt: new Date(t),
          endsAt: new Date(t + service.durationMinutes * MS),
          effectiveEndAt: new Date(t + needed),
        });
      }
    }
  }

  // Step 8 — chronological order (windows are already ordered, but holds
  // spanning window edges keep this cheap and certain).
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

// Can this exact interval be booked? Used at claim time (DD22): slot lists
// shift whenever a hold expires or a booking is cancelled (one slot per
// gap, at the gap start), so a picked time must not be validated by exact
// list membership. The interval is valid when it fits the day's SHAPE
// (window, lead time, cap, candidate windows) and overlaps nothing the
// engine knows about — the DB EXCLUDE constraints stay the final word on
// races.
export function canOfferInterval(
  input: AvailabilityInput,
  startsAt: Date,
): boolean {
  const { provider, service, date, now, templateDay, override, occupied } = input;

  if (!isDateBookable(date, provider.bookingWindow, now, provider.timezone)) {
    return false;
  }
  if (provider.scheduleType === "flexible" && override?.kind !== "open") {
    return false;
  }
  if (templateDay?.serviceIds && !templateDay.serviceIds.includes(service.id)) {
    return false;
  }
  const cap = override?.dailyCap ?? templateDay?.dailyCap ?? null;
  if (cap !== null && occupied.confirmedBookings.length >= cap) {
    return false;
  }

  const bufferMinutes = service.bufferMinutes ?? provider.globalBufferMinutes;
  const neededMinutes = service.durationMinutes + bufferMinutes;
  const start = startsAt.getTime();
  const end = start + neededMinutes * MS;

  if (start < now.getTime() + provider.minLeadTimeMinutes * MS) return false;

  const hours = effectiveHours(templateDay, override);
  if (!hours) return false;
  const reserved = override?.kind === "open" ? [] : (templateDay?.reservedBlocks ?? []);
  const blocks = [...reserved, ...(override?.extraBlocks ?? [])];

  const fitsWindow = buildLocalWindows(hours, blocks).some((w) => {
    const range = toUtcRange(date, w, provider.timezone);
    return start >= range.start.getTime() && end <= range.end.getTime();
  });
  if (!fitsWindow) return false;

  for (const r of [...occupied.confirmedBookings, ...occupied.activeHolds]) {
    if (start < r.effectiveEndAt.getTime() && end > r.startsAt.getTime()) {
      return false;
    }
  }
  return true;
}
