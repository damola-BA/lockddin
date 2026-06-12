import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { canOfferInterval, getAvailableSlots } from "./engine";
import type {
  AvailabilityInput,
  EngineProvider,
  EngineService,
  TemplateDay,
} from "./types";

const TZ = "Europe/Brussels";

const baseProvider: EngineProvider = {
  timezone: TZ,
  bookingWindow: "3_months",
  minLeadTimeMinutes: 0,
  globalBufferMinutes: 0,
  scheduleType: "regular",
};

function day(partial: Partial<TemplateDay> = {}): TemplateDay {
  return {
    weekday: 1,
    start: "09:00",
    end: "18:00",
    dailyCap: null,
    serviceIds: null,
    reservedBlocks: [],
    ...partial,
  };
}

function input(partial: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    provider: baseProvider,
    service: { id: "svc", durationMinutes: 60, bufferMinutes: null },
    date: "2026-07-14", // a Tuesday
    now: fromZonedTime("2026-07-01T08:00:00", TZ),
    templateDay: day(),
    override: null,
    occupied: { confirmedBookings: [], activeHolds: [] },
    ...partial,
  };
}

function local(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, TZ);
}

function range(date: string, start: string, end: string) {
  return { startsAt: local(date, start), effectiveEndAt: local(date, end) };
}

function startTimes(slots: ReturnType<typeof getAvailableSlots>): Date[] {
  return slots.map((s) => s.startsAt);
}

// ── Worked example from the wireframes ───────────────────────────────
// Balayage: 180 min, €145 — must appear correctly around reserved blocks
// and existing bookings.

describe("worked example: Balayage 180min", () => {
  const balayage: EngineService = {
    id: "balayage",
    durationMinutes: 180,
    bufferMinutes: null,
  };

  it("fits around a lunch block: one slot per gap, at gap start", () => {
    const slots = getAvailableSlots(
      input({
        service: balayage,
        templateDay: day({ reservedBlocks: [{ start: "12:00", end: "13:00" }] }),
      }),
    );
    // 09:00–12:00 fits exactly (180); 13:00–18:00 fits (300) → slot at 13:00
    expect(startTimes(slots)).toEqual([
      local("2026-07-14", "09:00"),
      local("2026-07-14", "13:00"),
    ]);
  });

  it("respects an existing booking inside the afternoon window", () => {
    const slots = getAvailableSlots(
      input({
        service: balayage,
        templateDay: day({ reservedBlocks: [{ start: "12:00", end: "13:00" }] }),
        occupied: {
          confirmedBookings: [range("2026-07-14", "13:00", "15:00")],
          activeHolds: [],
        },
      }),
    );
    // afternoon gap is now 15:00–18:00 = exactly 180
    expect(startTimes(slots)).toEqual([
      local("2026-07-14", "09:00"),
      local("2026-07-14", "15:00"),
    ]);
  });

  it("active holds occupy exactly like bookings", () => {
    const slots = getAvailableSlots(
      input({
        service: balayage,
        occupied: {
          confirmedBookings: [],
          activeHolds: [range("2026-07-14", "09:00", "10:30")],
        },
      }),
    );
    // 10:30–18:00 = 450 → one slot at 10:30
    expect(startTimes(slots)).toEqual([local("2026-07-14", "10:30")]);
  });

  it("buffer is invisible to the client but occupies the calendar", () => {
    const slots = getAvailableSlots(
      input({
        service: { id: "svc", durationMinutes: 90, bufferMinutes: 30 },
        templateDay: day({ start: "09:00", end: "11:00" }),
      }),
    );
    // 120-min window fits 90+30 exactly
    expect(slots).toHaveLength(1);
    expect(slots[0].endsAt.getTime() - slots[0].startsAt.getTime()).toBe(90 * 60_000);
    expect(slots[0].effectiveEndAt.getTime() - slots[0].startsAt.getTime()).toBe(
      120 * 60_000,
    );
  });
});

// ── Step semantics ───────────────────────────────────────────────────

describe("8-step semantics", () => {
  it("step 1: service not allowed on this day → empty", () => {
    const slots = getAvailableSlots(
      input({ templateDay: day({ serviceIds: ["other"] }) }),
    );
    expect(slots).toEqual([]);
  });

  it("step 2: cap reached exactly → empty; one under cap → slots", () => {
    const occupied = {
      confirmedBookings: [
        range("2026-07-14", "09:00", "10:00"),
        range("2026-07-14", "10:00", "11:00"),
      ],
      activeHolds: [],
    };
    expect(
      getAvailableSlots(input({ templateDay: day({ dailyCap: 2 }), occupied })),
    ).toEqual([]);
    expect(
      getAvailableSlots(input({ templateDay: day({ dailyCap: 3 }), occupied })),
    ).not.toEqual([]);
  });

  it("step 3: service longer than any window → empty", () => {
    const slots = getAvailableSlots(
      input({
        service: { id: "svc", durationMinutes: 300, bufferMinutes: null },
        templateDay: day({ reservedBlocks: [{ start: "13:00", end: "14:00" }] }),
      }),
    );
    // windows are 240 + 240 minutes — nothing fits 300
    expect(slots).toEqual([]);
  });

  it("step 4: lead time hides slots starting before now+lead", () => {
    const slots = getAvailableSlots(
      input({
        provider: { ...baseProvider, minLeadTimeMinutes: 120 },
        now: local("2026-07-14", "08:00"),
      }),
    );
    // gap starts at 09:00 < 10:00 lead boundary → the 09:00 slot is hidden
    expect(slots).toEqual([]);
  });

  it("slot exactly at closing time fits; one minute more does not", () => {
    const fits = getAvailableSlots(
      input({
        service: { id: "svc", durationMinutes: 540, bufferMinutes: null },
      }),
    );
    expect(startTimes(fits)).toEqual([local("2026-07-14", "09:00")]);

    const doesNot = getAvailableSlots(
      input({
        service: { id: "svc", durationMinutes: 541, bufferMinutes: null },
      }),
    );
    expect(doesNot).toEqual([]);
  });

  it("closed override → empty; modified override narrows hours", () => {
    expect(
      getAvailableSlots(
        input({
          override: { kind: "closed", start: null, end: null, extraBlocks: [], dailyCap: null },
        }),
      ),
    ).toEqual([]);

    const slots = getAvailableSlots(
      input({
        override: {
          kind: "modified",
          start: "10:00",
          end: "12:00",
          extraBlocks: [],
          dailyCap: null,
        },
      }),
    );
    expect(startTimes(slots)).toEqual([local("2026-07-14", "10:00")]);
  });

  it("flexible mode: only kind='open' override dates are available", () => {
    const flexible = { ...baseProvider, scheduleType: "flexible" as const };
    expect(getAvailableSlots(input({ provider: flexible }))).toEqual([]);
    const slots = getAvailableSlots(
      input({
        provider: flexible,
        templateDay: null,
        override: { kind: "open", start: "09:00", end: "12:00", extraBlocks: [], dailyCap: null },
      }),
    );
    expect(startTimes(slots)).toEqual([local("2026-07-14", "09:00")]);
  });
});

// ── canOfferInterval (DD22 regression) ───────────────────────────────
// Gap-start slots shift when a hold expires or a booking is cancelled, so
// claim-time validation must accept any free interval that fits the day's
// shape — not just current list members.

describe("canOfferInterval", () => {
  it("REGRESSION: displayed 10:00 stays bookable after the 09:00 booking vanishes", () => {
    // With a 09:00–10:00 booking, the engine offers 10:00 (gap start).
    const withBooking = input({
      occupied: {
        confirmedBookings: [range("2026-07-14", "09:00", "10:00")],
        activeHolds: [],
      },
    });
    expect(startTimes(getAvailableSlots(withBooking))).toEqual([
      local("2026-07-14", "10:00"),
    ]);

    // The booking is cancelled: the list now says 09:00 only…
    const freed = input();
    expect(startTimes(getAvailableSlots(freed))).toEqual([
      local("2026-07-14", "09:00"),
    ]);
    // …but the client who was shown 10:00 must still be able to take it.
    expect(canOfferInterval(freed, local("2026-07-14", "10:00"))).toBe(true);
  });

  it("accepts a listed slot (display and claim agree on the common path)", () => {
    const i = input();
    for (const slot of getAvailableSlots(i)) {
      expect(canOfferInterval(i, slot.startsAt)).toBe(true);
    }
  });

  it("rejects an interval overlapping a confirmed booking or active hold", () => {
    const i = input({
      occupied: {
        confirmedBookings: [range("2026-07-14", "09:00", "10:00")],
        activeHolds: [range("2026-07-14", "14:00", "15:00")],
      },
    });
    expect(canOfferInterval(i, local("2026-07-14", "09:30"))).toBe(false);
    expect(canOfferInterval(i, local("2026-07-14", "14:30"))).toBe(false);
    expect(canOfferInterval(i, local("2026-07-14", "10:00"))).toBe(true);
  });

  it("rejects intervals outside hours, over blocks, or past closing", () => {
    const i = input({
      templateDay: day({ reservedBlocks: [{ start: "12:00", end: "13:00" }] }),
    });
    expect(canOfferInterval(i, local("2026-07-14", "08:00"))).toBe(false);
    expect(canOfferInterval(i, local("2026-07-14", "12:30"))).toBe(false); // in block
    expect(canOfferInterval(i, local("2026-07-14", "11:30"))).toBe(false); // runs into block
    expect(canOfferInterval(i, local("2026-07-14", "17:30"))).toBe(false); // past close
    expect(canOfferInterval(i, local("2026-07-14", "17:00"))).toBe(true); // exact fit
  });

  it("respects lead time, booking window, and daily cap", () => {
    const lead = input({
      provider: { ...baseProvider, minLeadTimeMinutes: 120 },
      now: local("2026-07-14", "08:30"),
    });
    expect(canOfferInterval(lead, local("2026-07-14", "10:00"))).toBe(false);
    expect(canOfferInterval(lead, local("2026-07-14", "10:30"))).toBe(true);

    const outside = input({ date: "2026-10-01" });
    expect(canOfferInterval(outside, local("2026-10-01", "09:00"))).toBe(false);

    const capped = input({
      templateDay: day({ dailyCap: 1 }),
      occupied: {
        confirmedBookings: [range("2026-07-14", "09:00", "10:00")],
        activeHolds: [],
      },
    });
    expect(canOfferInterval(capped, local("2026-07-14", "11:00"))).toBe(false);
  });
});

// ── Booking-window boundaries (calendar, Europe/Brussels) ────────────

describe("booking window boundaries", () => {
  it("current_week ends on Sunday: Sunday bookable, Monday not", () => {
    const provider = { ...baseProvider, bookingWindow: "current_week" as const };
    const now = local("2026-07-14", "08:00"); // Tuesday
    const sunday = input({
      provider,
      now,
      date: "2026-07-19",
      templateDay: day({ weekday: 6 }),
    });
    const monday = input({
      provider,
      now,
      date: "2026-07-20",
      templateDay: day({ weekday: 0 }),
    });
    expect(getAvailableSlots(sunday)).not.toEqual([]);
    expect(getAvailableSlots(monday)).toEqual([]);
  });

  it("3_months = current + next two full months (boundary inclusive)", () => {
    const now = local("2026-07-14", "08:00");
    const lastDay = input({ now, date: "2026-09-30" });
    const firstOut = input({ now, date: "2026-10-01" });
    expect(getAvailableSlots(lastDay)).not.toEqual([]);
    expect(getAvailableSlots(firstOut)).toEqual([]);
  });

  it("3_days includes today and two more", () => {
    const provider = { ...baseProvider, bookingWindow: "3_days" as const };
    const now = local("2026-07-14", "08:00");
    expect(
      getAvailableSlots(input({ provider, now, date: "2026-07-16" })),
    ).not.toEqual([]);
    expect(
      getAvailableSlots(input({ provider, now, date: "2026-07-17" })),
    ).toEqual([]);
  });

  it("dates in the past are never bookable", () => {
    const now = local("2026-07-14", "08:00");
    expect(getAvailableSlots(input({ now, date: "2026-07-13" }))).toEqual([]);
  });
});

// ── DST transitions (Europe/Brussels) ────────────────────────────────

describe("DST", () => {
  it("spring forward (2026-03-29): face-value window passes but real time is short → no slot", () => {
    // 00:30–05:30 local reads as 300 face minutes, but 02:00→03:00 vanishes:
    // only 240 real minutes exist. A 300-min service must NOT get a slot.
    const slots = getAvailableSlots(
      input({
        date: "2026-03-29",
        now: local("2026-03-20", "08:00"),
        service: { id: "svc", durationMinutes: 300, bufferMinutes: null },
        templateDay: day({ start: "00:30", end: "05:30" }),
      }),
    );
    expect(slots).toEqual([]);
  });

  it("spring forward: slots remain exactly 60 real minutes", () => {
    const slots = getAvailableSlots(
      input({
        date: "2026-03-29",
        now: local("2026-03-20", "08:00"),
        templateDay: day({ start: "00:30", end: "05:30" }),
      }),
    );
    expect(slots).toHaveLength(1);
    for (const slot of slots) {
      expect(slot.endsAt.getTime() - slot.startsAt.getTime()).toBe(60 * 60_000);
    }
  });

  it("fall back (2026-10-25): 90-min slots stay 90 real minutes and never overlap a booking", () => {
    const booking = range("2026-10-25", "09:00", "10:30");
    const slots = getAvailableSlots(
      input({
        date: "2026-10-25",
        now: local("2026-10-20", "08:00"),
        service: { id: "svc", durationMinutes: 90, bufferMinutes: null },
        occupied: { confirmedBookings: [booking], activeHolds: [] },
      }),
    );
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.endsAt.getTime() - slot.startsAt.getTime()).toBe(90 * 60_000);
      const overlaps =
        slot.startsAt < booking.effectiveEndAt && slot.effectiveEndAt > booking.startsAt;
      expect(overlaps).toBe(false);
    }
  });

  it("UTC offsets actually differ across the spring transition", () => {
    const before = local("2026-03-28", "09:00"); // CET = UTC+1
    const after = local("2026-03-29", "09:00"); // CEST = UTC+2
    expect(before.toISOString()).toBe("2026-03-28T08:00:00.000Z");
    expect(after.toISOString()).toBe("2026-03-29T07:00:00.000Z");
  });
});
