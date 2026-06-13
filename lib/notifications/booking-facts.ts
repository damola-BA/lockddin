import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/db/admin";
import { resolveServiceSet } from "@/lib/booking/service-set";

// Everything the notification jobs need to know about one booking,
// loaded in a single query.
export type BookingFacts = {
  bookingId: string;
  status: string;
  startsAt: string;
  createdAt: string;
  cancellationWindowHours: number;
  whenText: string;
  manageToken: string;
  clientFirstName: string;
  clientEmail: string | null;
  serviceName: string;
  prepInstructions: string | null;
  providerId: string;
  providerEmail: string;
  businessName: string;
  locationText: string | null;
  slug: string;
  clientId: string;
};

export async function getBookingFacts(
  bookingId: string,
): Promise<BookingFacts | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      `id, status, starts_at, created_at, cancellation_window_hours, manage_token, client_id, service_ids,
       clients (first_name, email),
       providers (id, email, business_name, provider_name, location_text, timezone, slug)`,
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;

  const client = data.clients as unknown as {
    first_name: string;
    email: string | null;
  };
  const provider = data.providers as unknown as {
    id: string;
    email: string;
    business_name: string | null;
    provider_name: string | null;
    location_text: string | null;
    timezone: string;
    slug: string;
  };

  const services = await resolveServiceSet(provider.id, data.service_ids ?? []);

  return {
    bookingId: data.id,
    status: data.status,
    startsAt: data.starts_at,
    createdAt: data.created_at,
    cancellationWindowHours: data.cancellation_window_hours,
    whenText: formatInTimeZone(
      new Date(data.starts_at),
      provider.timezone,
      "EEEE d MMMM yyyy 'at' HH:mm",
    ),
    manageToken: data.manage_token,
    clientFirstName: client.first_name,
    clientEmail: client.email,
    serviceName: services.label,
    prepInstructions: services.prepInstructions,
    providerId: provider.id,
    providerEmail: provider.email,
    businessName: provider.business_name ?? provider.provider_name ?? "Your provider",
    locationText: provider.location_text,
    slug: provider.slug,
    clientId: data.client_id,
  };
}
