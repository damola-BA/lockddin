import "server-only";
import { createAdminClient } from "@/lib/db/admin";

// Resolve a booking's set of services into one combined view: a label
// ("Gel Nails + Braiding"), summed price/duration, and merged prep notes.
// Multi-service bookings store service_ids[]; reads resolve through here.

export type ServiceSet = {
  names: string[];
  label: string;
  priceCents: number;
  durationMinutes: number;
  prepInstructions: string | null;
};

export type ServiceRow = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  prep_instructions: string | null;
};

// Combine an ordered service-id list against a preloaded map. Use this in
// list views (load the provider's services once, combine per booking) to
// avoid a query per row.
export function combineServices(
  serviceIds: string[],
  map: Map<string, ServiceRow>,
): ServiceSet {
  const ordered = serviceIds
    .map((id) => map.get(id))
    .filter((s): s is ServiceRow => Boolean(s));
  const names = ordered.map((s) => s.name);
  const preps = ordered
    .map((s) => s.prep_instructions)
    .filter((p): p is string => Boolean(p));
  return {
    names,
    label: names.join(" + "),
    priceCents: ordered.reduce((sum, s) => sum + s.price_cents, 0),
    durationMinutes: ordered.reduce((sum, s) => sum + s.duration_minutes, 0),
    prepInstructions: preps.length ? preps.join(" ") : null,
  };
}

export async function getProviderServiceMap(
  providerId: string,
): Promise<Map<string, ServiceRow>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("services")
    .select("id, name, price_cents, duration_minutes, prep_instructions")
    .eq("provider_id", providerId);
  return new Map((data ?? []).map((s) => [s.id, s as ServiceRow]));
}

export async function resolveServiceSet(
  providerId: string,
  serviceIds: string[],
): Promise<ServiceSet> {
  return combineServices(serviceIds, await getProviderServiceMap(providerId));
}
