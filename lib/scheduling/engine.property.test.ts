import { describe, it } from "vitest";
import fc from "fast-check";
import { fromZonedTime } from "date-fns-tz";
import { getAvailableSlots } from "./engine";
import { localInstant } from "./windows";
import type { AvailabilityInput, TimeBlock } from "./types";

// Property tests (F4 required): for random templates/blocks/bookings,
// every returned slot must
//   (a) fit duration+buffer inside working hours minus blocks,
//   (b) overlap no confirmed booking or active hold,
//   (c) respect lead time and booking-window boundaries.

const TZ = "Europe/Brussels";
const DATE = "2026-07-14"; // fixed Tuesday well inside the window
const MS = 60_000;

function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// 5-minute grid keeps the search space meaningful.
const grid = (min: number, max: number) =>
  fc.integer({ min: min / 5, max: max / 5 }).map((n) => n * 5);

const arbHours = fc
  .tuple(grid(0, 720), grid(60, 720))
  .map(([start, len]) => ({ start, end: Math.min(start + len, 1435) }))
  .filter((h) => h.end - h.start >= 60);

const arbBlock = (hours: { start: number; end: number }) =>
  fc
    .tuple(grid(hours.start, hours.end - 5), grid(5, 240))
    .map(([s, len]) => ({ start: s, end: Math.min(s + len, hours.end) }))
    .filter((b) => b.end > b.start);

const arbCase = arbHours.chain((hours) =>
  fc.record({
    hours: fc.constant(hours),
    blocks: fc.array(arbBlock(hours), { maxLength: 4 }),
    bookings: fc.array(arbBlock(hours), { maxLength: 4 }),
    holds: fc.array(arbBlock(hours), { maxLength: 3 }),
    duration: grid(15, 240),
    buffer: grid(0, 60),
    leadMinutes: grid(0, 1440),
  }),
);

function toUtc(b: { start: number; end: number }) {
  return {
    startsAt: localInstant(DATE, b.start, TZ),
    effectiveEndAt: localInstant(DATE, b.end, TZ),
  };
}

describe("engine properties", () => {
  it("slots fit windows, avoid occupied ranges, respect lead time", () => {
    fc.assert(
      fc.property(arbCase, (c) => {
        const now = fromZonedTime("2026-07-13T12:00:00", TZ);
        const blocks: TimeBlock[] = c.blocks.map((b) => ({
          start: minutesToTime(b.start),
          end: minutesToTime(b.end),
        }));
        const occupiedRanges = [...c.bookings, ...c.holds].map(toUtc);

        const input: AvailabilityInput = {
          provider: {
            timezone: TZ,
            bookingWindow: "3_months",
            minLeadTimeMinutes: c.leadMinutes,
            globalBufferMinutes: 0,
            scheduleType: "regular",
          },
          service: { id: "svc", durationMinutes: c.duration, bufferMinutes: c.buffer },
          date: DATE,
          now,
          templateDay: {
            weekday: 1,
            start: minutesToTime(c.hours.start),
            end: minutesToTime(c.hours.end),
            dailyCap: null,
            serviceIds: null,
            reservedBlocks: blocks,
          },
          override: null,
          occupied: {
            confirmedBookings: c.bookings.map(toUtc),
            activeHolds: c.holds.map(toUtc),
          },
        };

        const slots = getAvailableSlots(input);
        const needed = (c.duration + c.buffer) * MS;
        const leadBoundary = now.getTime() + c.leadMinutes * MS;
        const hoursStart = localInstant(DATE, c.hours.start, TZ).getTime();
        const hoursEnd = localInstant(DATE, c.hours.end, TZ).getTime();

        for (const slot of slots) {
          const s = slot.startsAt.getTime();
          const e = slot.effectiveEndAt.getTime();

          // effective span is exactly duration + buffer
          if (e - s !== needed) return false;

          // (a) inside working hours
          if (s < hoursStart || e > hoursEnd) return false;

          // (a) overlaps no reserved block
          for (const b of c.blocks) {
            const bs = localInstant(DATE, b.start, TZ).getTime();
            const be = localInstant(DATE, b.end, TZ).getTime();
            if (s < be && e > bs) return false;
          }

          // (b) overlaps no booking or hold
          for (const r of occupiedRanges) {
            if (s < r.effectiveEndAt.getTime() && e > r.startsAt.getTime()) {
              return false;
            }
          }

          // (c) lead time
          if (s < leadBoundary) return false;
        }

        // slots are chronological and unique
        for (let i = 1; i < slots.length; i++) {
          if (slots[i].startsAt.getTime() <= slots[i - 1].startsAt.getTime()) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 500 },
    );
  });

  it("never returns a slot outside the booking window", () => {
    const arbWindow = fc.constantFrom(
      "3_days" as const,
      "current_week" as const,
      "current_month" as const,
      "3_months" as const,
    );
    const arbOffset = fc.integer({ min: 0, max: 120 });

    fc.assert(
      fc.property(arbWindow, arbOffset, (bookingWindow, offsetDays) => {
        const now = fromZonedTime("2026-07-14T08:00:00", TZ);
        const target = new Date(Date.UTC(2026, 6, 14 + offsetDays));
        const date = target.toISOString().slice(0, 10);

        const slots = getAvailableSlots({
          provider: {
            timezone: TZ,
            bookingWindow,
            minLeadTimeMinutes: 0,
            globalBufferMinutes: 0,
            scheduleType: "regular",
          },
          service: { id: "svc", durationMinutes: 60, bufferMinutes: null },
          date,
          now,
          templateDay: {
            weekday: 0,
            start: "09:00",
            end: "18:00",
            dailyCap: null,
            serviceIds: null,
            reservedBlocks: [],
          },
          override: null,
          occupied: { confirmedBookings: [], activeHolds: [] },
        });

        // boundary table, computed independently of the implementation
        const last =
          bookingWindow === "3_days"
            ? "2026-07-16"
            : bookingWindow === "current_week"
              ? "2026-07-19" // Sunday of that week
              : bookingWindow === "current_month"
                ? "2026-07-31"
                : "2026-09-30";
        const inWindow = date <= last;
        return inWindow ? slots.length > 0 : slots.length === 0;
      }),
      { numRuns: 200 },
    );
  });

  it("determinism: same input twice → identical output", () => {
    fc.assert(
      fc.property(arbCase, (c) => {
        const make = (): AvailabilityInput => ({
          provider: {
            timezone: TZ,
            bookingWindow: "3_months",
            minLeadTimeMinutes: c.leadMinutes,
            globalBufferMinutes: c.buffer,
            scheduleType: "regular",
          },
          service: { id: "svc", durationMinutes: c.duration, bufferMinutes: null },
          date: DATE,
          now: fromZonedTime("2026-07-13T12:00:00", TZ),
          templateDay: {
            weekday: 1,
            start: minutesToTime(c.hours.start),
            end: minutesToTime(c.hours.end),
            dailyCap: null,
            serviceIds: null,
            reservedBlocks: c.blocks.map((b) => ({
              start: minutesToTime(b.start),
              end: minutesToTime(b.end),
            })),
          },
          override: null,
          occupied: {
            confirmedBookings: c.bookings.map(toUtc),
            activeHolds: c.holds.map(toUtc),
          },
        });
        const a = getAvailableSlots(make());
        const b = getAvailableSlots(make());
        return JSON.stringify(a) === JSON.stringify(b);
      }),
      { numRuns: 100 },
    );
  });
});
