import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { inngest } from "@/lib/inngest/client";
import type { Slot } from "./types";

// Server-side hold lifecycle (F4). All concurrency lives in the Postgres
// functions from migration 20260611180000 — these wrappers only shuttle
// data and schedule the expiry job.

export type ClaimResult =
  | { ok: true; holdId: string; expiresAt: Date }
  | { ok: false; reason: "slot_taken" };

export async function claimHold(args: {
  providerId: string;
  serviceId: string;
  slot: Slot;
}): Promise<ClaimResult> {
  const admin = createAdminClient();
  const { data: holdId, error } = await admin.rpc("claim_slot_hold", {
    p_provider_id: args.providerId,
    p_service_id: args.serviceId,
    p_starts_at: args.slot.startsAt.toISOString(),
    p_ends_at: args.slot.endsAt.toISOString(),
    p_effective_end_at: args.slot.effectiveEndAt.toISOString(),
  });
  if (error) throw new Error(`claim_slot_hold failed: ${error.message}`);
  if (!holdId) return { ok: false, reason: "slot_taken" };

  const expiresAt = new Date(Date.now() + 5 * 60_000);
  // Expiry job scheduled at hold creation (F4) — never setTimeout.
  await inngest.send({
    name: "booking/hold.created",
    data: { holdId, expiresAt: expiresAt.toISOString() },
  });
  return { ok: true, holdId, expiresAt };
}

export type ConvertResult =
  | { ok: true; bookingId: string }
  | { ok: false; reason: "hold_released" };

export async function convertHold(args: {
  holdId: string;
  clientId: string;
  cancellationWindowHours: number;
  manageToken: string;
  source: "client" | "manual";
}): Promise<ConvertResult> {
  const admin = createAdminClient();
  const { data: bookingId, error } = await admin.rpc("convert_hold_to_booking", {
    p_hold_id: args.holdId,
    p_client_id: args.clientId,
    p_cancellation_window_hours: args.cancellationWindowHours,
    p_manage_token: args.manageToken,
    p_source: args.source,
  });
  if (error) throw new Error(`convert_hold_to_booking failed: ${error.message}`);
  if (!bookingId) return { ok: false, reason: "hold_released" };
  return { ok: true, bookingId };
}
