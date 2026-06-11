import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
let userId: string;

const SLOT = {
  startsAt: "2027-01-12T09:00:00.000Z",
  endsAt: "2027-01-12T10:00:00.000Z",
  effectiveEndAt: "2027-01-12T10:00:00.000Z",
};

async function claim(): Promise<string | null> {
  const { data, error } = await admin.rpc("claim_slot_hold", {
    p_provider_id: providerId,
    p_service_id: serviceId,
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
});

if (!enabled) {
  describe("hold concurrency (real Postgres)", () => {
    it.skip("skipped: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set", () => {});
  });
}
