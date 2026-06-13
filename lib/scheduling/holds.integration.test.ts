import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getDayAvailability } from "./availability";

// F4 required test: two parallel hold claims for the same slot — exactly
// one wins. Runs against REAL Postgres (the live Supabase project), never
// a mock. Gated behind env vars so `npm test` stays offline-safe.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && key);

const d = describe.runIf(enabled);

let admin: SupabaseClient;
let providerId: string;
let serviceId: string;
let serviceId2: string;
let userId: string;

const SLOT = {
  startsAt: "2027-01-12T09:00:00.000Z",
  endsAt: "2027-01-12T10:00:00.000Z",
  effectiveEndAt: "2027-01-12T10:00:00.000Z",
};

async function claim(): Promise<string | null> {
  const { data, error } = await admin.rpc("claim_slot_hold", {
    p_provider_id: providerId,
    p_service_ids: [serviceId],
    p_starts_at: SLOT.startsAt,
    p_ends_at: SLOT.endsAt,
    p_effective_end_at: SLOT.effectiveEndAt,
  });
  if (error) throw new Error(error.message);
  return data;
}

d("hold concurrency (real Postgres)", () => {
  beforeAll(async () => {
    admin = createClient(url!, key!, { auth: { persistSession: false } });

    // Test fixtures: a throwaway auth user + provider + service.
    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email: `concurrency-test-${Date.now()}@lockddin.internal`,
        password: crypto.randomUUID(),
        email_confirm: true,
      });
    if (userError) throw new Error(userError.message);
    userId = userData.user.id;

    const { error: provError } = await admin.from("providers").insert({
      id: userId,
      email: userData.user.email,
      slug: `concurrency-test-${Date.now()}`,
      booking_window: "3_months",
      schedule_type: "regular",
    });
    if (provError) throw new Error(provError.message);
    providerId = userId;

    const { data: svc, error: svcError } = await admin
      .from("services")
      .insert({
        provider_id: providerId,
        name: "Test service",
        duration_minutes: 60,
        price_cents: 5000,
        sort_order: 1,
      })
      .select("id")
      .single();
    if (svcError) throw new Error(svcError.message);
    serviceId = svc.id;

    const { data: svc2, error: svc2Error } = await admin
      .from("services")
      .insert({
        provider_id: providerId,
        name: "Second service",
        duration_minutes: 30,
        price_cents: 3000,
        sort_order: 2,
      })
      .select("id")
      .single();
    if (svc2Error) throw new Error(svc2Error.message);
    serviceId2 = svc2.id;

    // 2027-01-12 is a Tuesday (weekday 1 in 0=Mon convention); the loader
    // regression test needs a working day around the SLOT fixture.
    const { error: dayError } = await admin.from("week_template_days").insert({
      provider_id: providerId,
      weekday: 1,
      start_time: "09:00",
      end_time: "18:00",
    });
    if (dayError) throw new Error(dayError.message);
  });

  afterAll(async () => {
    // Cascades wipe provider-owned rows; then drop the auth user.
    if (userId) {
      await admin.from("providers").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("two parallel claims for the same slot: exactly one wins", async () => {
    const [a, b] = await Promise.all([claim(), claim()]);
    const winners = [a, b].filter((id) => id !== null);
    expect(winners).toHaveLength(1);
  });

  it("a third claim after the winner also loses", async () => {
    const third = await claim();
    expect(third).toBeNull();
  });

  it("conversion: winner converts exactly once; the hold cannot convert twice", async () => {
    const { data: holds } = await admin
      .from("slot_holds")
      .select("id")
      .eq("provider_id", providerId)
      .eq("status", "active");
    expect(holds).toHaveLength(1);
    const holdId = holds![0].id;

    const { data: client } = await admin
      .from("clients")
      .insert({
        provider_id: providerId,
        phone: "+32400000001",
        first_name: "Test",
      })
      .select("id")
      .single();

    const convert = (token: string) =>
      admin
        .rpc("convert_hold_to_booking", {
          p_hold_id: holdId,
          p_client_id: client!.id,
          p_cancellation_window_hours: 12,
          p_manage_token: token,
          p_source: "client",
        })
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          return data as string | null;
        });

    const first = await convert(`tok-${Date.now()}-1`);
    expect(first).not.toBeNull();

    const second = await convert(`tok-${Date.now()}-2`);
    expect(second).toBeNull(); // hold no longer active

    // The booking EXCLUDE backstop: claiming the same slot again must fail
    // against the now-confirmed booking.
    const postBooking = await claim();
    expect(postBooking).toBeNull();
  });

  // REGRESSION (the "engine and bookings out of sync" bug): the loader's
  // day window once collapsed to zero width ("T24:00:00" parsed as same-day
  // midnight), so the engine never saw confirmed bookings and displayed
  // already-booked times. The conversion test above left a confirmed
  // booking at 09:00–10:00 UTC on 2027-01-12 — availability for that day
  // must exclude it.
  it("availability excludes the confirmed booking (loader day window)", async () => {
    const slots = await getDayAvailability({
      providerId,
      serviceIds: [serviceId],
      date: "2027-01-12",
      now: new Date("2026-12-30T12:00:00Z"),
    });
    expect(slots.length).toBeGreaterThan(0);
    const bookedStart = new Date(SLOT.startsAt).getTime();
    const bookedEnd = new Date(SLOT.effectiveEndAt).getTime();
    for (const slot of slots) {
      const overlaps =
        slot.startsAt.getTime() < bookedEnd &&
        slot.effectiveEndAt.getTime() > bookedStart;
      expect(overlaps).toBe(false);
    }
    // The gap right after the booking is offered (10:00Z = 11:00 local).
    expect(slots.some((s) => s.startsAt.toISOString() === SLOT.effectiveEndAt)).toBe(
      true,
    );
  });

  // Multi-service (DD27): a combined booking sums the durations. Two
  // services of 60 + 30 minutes must yield 90-minute slots.
  it("combined availability sums service durations", async () => {
    const slots = await getDayAvailability({
      providerId,
      serviceIds: [serviceId, serviceId2],
      date: "2027-01-19", // a later free Tuesday
      now: new Date("2026-12-30T12:00:00Z"),
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.endsAt.getTime() - slot.startsAt.getTime()).toBe(90 * 60_000);
    }
  });

  it("a multi-service hold converts to a booking carrying both services", async () => {
    const start = "2027-01-26T09:00:00.000Z";
    const { data: holdId } = await admin.rpc("claim_slot_hold", {
      p_provider_id: providerId,
      p_service_ids: [serviceId, serviceId2],
      p_starts_at: start,
      p_ends_at: "2027-01-26T10:30:00.000Z",
      p_effective_end_at: "2027-01-26T10:30:00.000Z",
    });
    expect(holdId).not.toBeNull();

    const { data: client } = await admin
      .from("clients")
      .insert({ provider_id: providerId, phone: "+32400000099", first_name: "Multi" })
      .select("id")
      .single();

    const { data: result } = await admin.rpc("convert_hold_to_booking", {
      p_hold_id: holdId,
      p_client_id: client!.id,
      p_cancellation_window_hours: 12,
      p_manage_token: `multi-${Date.now()}`,
      p_source: "client",
    });
    expect(result).not.toBeNull();

    const { data: booking } = await admin
      .from("bookings")
      .select("service_ids, service_id")
      .eq("id", result as string)
      .single();
    expect(booking!.service_ids).toEqual([serviceId, serviceId2]);
    expect(booking!.service_id).toBe(serviceId); // primary = first
  });

  // F5 acceptance: two phones racing for the last slot — exactly one
  // confirms, the other is told the slot is gone.
  it("two parallel client confirms on one hold: exactly one books", async () => {
    const SLOT2 = {
      startsAt: "2027-01-13T09:00:00.000Z",
      endsAt: "2027-01-13T10:00:00.000Z",
      effectiveEndAt: "2027-01-13T10:00:00.000Z",
    };
    const { data: holdId, error } = await admin.rpc("claim_slot_hold", {
      p_provider_id: providerId,
      p_service_ids: [serviceId],
      p_starts_at: SLOT2.startsAt,
      p_ends_at: SLOT2.endsAt,
      p_effective_end_at: SLOT2.effectiveEndAt,
    });
    if (error) throw new Error(error.message);
    expect(holdId).not.toBeNull();

    const confirmAs = (phone: string, token: string) =>
      admin
        .rpc("confirm_client_booking", {
          p_hold_id: holdId,
          p_phone: phone,
          p_first_name: "Racer",
          p_email: "racer@lockddin.internal",
          p_manage_token: token,
        })
        .then(({ data, error: e }) => {
          if (e) throw new Error(e.message);
          return (data as { booking_id: string | null; error: string | null }[])[0];
        });

    const [a, b] = await Promise.all([
      confirmAs("+32400000011", `race-${Date.now()}-a`),
      confirmAs("+32400000012", `race-${Date.now()}-b`),
    ]);
    const winners = [a, b].filter((r) => r.booking_id !== null);
    const losers = [a, b].filter((r) => r.booking_id === null);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].error).toBe("released"); // hold consumed by the winner
  });
});

if (!enabled) {
  describe("hold concurrency (real Postgres)", () => {
    it.skip("skipped: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set", () => {});
  });
}
