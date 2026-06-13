import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { buildLocalWindows, localInstant, toMinutes } from "@/lib/scheduling/windows";
import { lastBookableDate } from "@/lib/scheduling/booking-window";

// Read side of the provider dashboard (F7) + client records (F10). Runs as
// the signed-in provider under RLS; confirmed/no-show bookings only — active
// holds are never shown (spec rule 4).

export type ProviderContext = {
  id: string;
  timezone: string;
  bookingWindow: "3_days" | "current_week" | "current_month" | "3_months";
  businessName: string;
  slug: string;
  locationText: string | null;
};

export async function getProviderContext(): Promise<ProviderContext | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("providers")
    .select("id, timezone, booking_window, business_name, provider_name, slug, location_text")
    .eq("id", user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    timezone: data.timezone,
    bookingWindow: data.booking_window,
    businessName: data.business_name ?? data.provider_name ?? "",
    slug: data.slug,
    locationText: data.location_text,
  };
}

export type DayBooking = {
  id: string;
  startsAt: string;
  endsAt: string;
  timeText: string;
  status: string;
  source: string;
  serviceName: string;
  priceCents: number;
  clientId: string;
  clientName: string;
  isPast: boolean;
};

export function todayLocal(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

export async function getDayBookings(
  provider: ProviderContext,
  date: string,
): Promise<DayBooking[]> {
  const supabase = await createServerSupabase();
  const dayStart = localInstant(date, 0, provider.timezone).toISOString();
  const dayEnd = localInstant(date, 1440, provider.timezone).toISOString();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, ends_at, effective_end_at, status, source, services (name, price_cents), clients (id, first_name)",
    )
    .eq("provider_id", provider.id)
    .in("status", ["confirmed", "no_show"])
    .gte("starts_at", dayStart)
    .lt("starts_at", dayEnd)
    .order("starts_at");

  return (data ?? []).map((b) => {
    const service = b.services as unknown as { name: string; price_cents: number };
    const client = b.clients as unknown as { id: string; first_name: string };
    return {
      id: b.id,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      timeText: `${formatInTimeZone(new Date(b.starts_at), provider.timezone, "HH:mm")}–${formatInTimeZone(new Date(b.ends_at), provider.timezone, "HH:mm")}`,
      status: b.status,
      source: b.source,
      serviceName: service.name,
      priceCents: service.price_cents,
      clientId: client.id,
      clientName: client.first_name,
      isPast: b.ends_at <= nowIso,
    };
  });
}

export type DayStats = { count: number; valueCents: number; gaps: number };

// Gaps = open stretches (≥15 min) left in the working day once reserved
// blocks and confirmed bookings are removed. Reuses the window builder.
export async function getDayStats(
  provider: ProviderContext,
  date: string,
  bookings: DayBooking[],
): Promise<DayStats> {
  const admin = createAdminClient();
  const jsDate = new Date(`${date}T12:00:00Z`);
  const weekday = (jsDate.getUTCDay() + 6) % 7;

  const [{ data: template }, { data: override }] = await Promise.all([
    admin
      .from("week_template_days")
      .select("start_time, end_time, reserved_blocks (start_time, end_time)")
      .eq("provider_id", provider.id)
      .eq("weekday", weekday)
      .maybeSingle(),
    admin
      .from("day_overrides")
      .select("kind, start_time, end_time, extra_blocks")
      .eq("provider_id", provider.id)
      .eq("date", date)
      .maybeSingle(),
  ]);

  const valueCents = bookings.reduce((sum, b) => sum + b.priceCents, 0);
  const count = bookings.length;

  let hours: { start: number; end: number } | null = null;
  let blocks: { start: string; end: string }[] = [];
  if (override?.kind === "closed") {
    hours = null;
  } else if (override?.kind === "open" || override?.kind === "modified") {
    if (override.start_time && override.end_time) {
      hours = { start: toMinutes(override.start_time), end: toMinutes(override.end_time) };
      blocks = ((override.extra_blocks ?? []) as { start: string; end: string }[]) ?? [];
    }
  } else if (template) {
    hours = { start: toMinutes(template.start_time), end: toMinutes(template.end_time) };
    blocks = (template.reserved_blocks ?? []).map((r) => ({
      start: r.start_time.slice(0, 5),
      end: r.end_time.slice(0, 5),
    }));
  }

  if (!hours) return { count, valueCents, gaps: 0 };

  const bookingBlocks = bookings.map((b) => ({
    start: formatInTimeZone(new Date(b.startsAt), provider.timezone, "HH:mm"),
    end: formatInTimeZone(new Date(b.endsAt), provider.timezone, "HH:mm"),
  }));
  const free = buildLocalWindows(hours, [...blocks, ...bookingBlocks]).filter(
    (w) => w.endMin - w.startMin >= 15,
  );
  return { count, valueCents, gaps: free.length };
}

export type WeekDay = { date: string; count: number; valueCents: number };

// Monday-anchored week containing `date`.
export function weekStartOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7; // 0=Mon
  d.setUTCDate(d.getUTCDate() - weekday);
  return d.toISOString().slice(0, 10);
}

export async function getWeekSummary(
  provider: ProviderContext,
  weekStart: string,
): Promise<WeekDay[]> {
  const supabase = await createServerSupabase();
  const start = localInstant(weekStart, 0, provider.timezone);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const end = localInstant(days[6], 1440, provider.timezone);

  const { data } = await supabase
    .from("bookings")
    .select("starts_at, services (price_cents)")
    .eq("provider_id", provider.id)
    .in("status", ["confirmed", "no_show"])
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());

  const byDay = new Map<string, { count: number; valueCents: number }>();
  for (const d of days) byDay.set(d, { count: 0, valueCents: 0 });
  for (const b of data ?? []) {
    const local = formatInTimeZone(new Date(b.starts_at), provider.timezone, "yyyy-MM-dd");
    const cell = byDay.get(local);
    if (cell) {
      cell.count += 1;
      cell.valueCents += (b.services as unknown as { price_cents: number }).price_cents;
    }
  }
  return days.map((date) => ({ date, ...byDay.get(date)! }));
}

export async function getMonthCounts(
  provider: ProviderContext,
  year: number,
  month: number, // 0-based
): Promise<Map<string, number>> {
  const supabase = await createServerSupabase();
  const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const start = localInstant(first, 0, provider.timezone);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const last = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const end = localInstant(last, 1440, provider.timezone);

  const { data } = await supabase
    .from("bookings")
    .select("starts_at")
    .eq("provider_id", provider.id)
    .in("status", ["confirmed", "no_show"])
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());

  const counts = new Map<string, number>();
  for (const b of data ?? []) {
    const local = formatInTimeZone(new Date(b.starts_at), provider.timezone, "yyyy-MM-dd");
    counts.set(local, (counts.get(local) ?? 0) + 1);
  }
  return counts;
}

/** Forward nav bound: the last date the booking window reaches. */
export function maxNavDate(provider: ProviderContext): string {
  return lastBookableDate(provider.bookingWindow, new Date(), provider.timezone);
}

// ── Booking detail ───────────────────────────────────────────────────

export type BookingDetail = {
  id: string;
  startsAt: string;
  whenText: string;
  status: string;
  source: string;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  durationMinutes: number;
  clientId: string;
  clientName: string;
  clientPhone: string;
  visitCount: number;
  isPast: boolean;
  cancellationWindowHours: number;
};

export async function getBookingDetail(
  provider: ProviderContext,
  bookingId: string,
): Promise<BookingDetail | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, starts_at, ends_at, status, source, cancellation_window_hours, service_id, services (name, price_cents, duration_minutes), clients (id, first_name, phone)",
    )
    .eq("provider_id", provider.id)
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;

  const service = data.services as unknown as {
    name: string;
    price_cents: number;
    duration_minutes: number;
  };
  const client = data.clients as unknown as {
    id: string;
    first_name: string;
    phone: string;
  };

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", provider.id)
    .eq("client_id", client.id)
    .in("status", ["confirmed", "no_show"]);

  return {
    id: data.id,
    startsAt: data.starts_at,
    whenText: formatInTimeZone(
      new Date(data.starts_at),
      provider.timezone,
      "EEEE d MMMM yyyy 'at' HH:mm",
    ),
    status: data.status,
    source: data.source,
    serviceId: data.service_id,
    serviceName: service.name,
    priceCents: service.price_cents,
    durationMinutes: service.duration_minutes,
    clientId: client.id,
    clientName: client.first_name,
    clientPhone: client.phone,
    visitCount: count ?? 0,
    isPast: data.ends_at <= new Date().toISOString(),
    cancellationWindowHours: data.cancellation_window_hours,
  };
}

// ── Client records (F10) ─────────────────────────────────────────────

export type ClientListRow = {
  id: string;
  firstName: string;
  phone: string;
  noShowCount: number;
  bookingCount: number;
};

export async function searchClients(
  provider: ProviderContext,
  query: string,
): Promise<ClientListRow[]> {
  const supabase = await createServerSupabase();
  let q = supabase
    .from("clients")
    .select("id, first_name, phone, no_show_count, bookings (id)")
    .eq("provider_id", provider.id)
    .order("first_name")
    .limit(100);
  if (query.trim()) {
    const term = `%${query.trim()}%`;
    q = q.or(`first_name.ilike.${term},phone.ilike.${term}`);
  }
  const { data } = await q;
  return (data ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    phone: c.phone,
    noShowCount: c.no_show_count,
    bookingCount: (c.bookings as unknown as { id: string }[]).length,
  }));
}

export type ClientDetail = {
  id: string;
  firstName: string;
  phone: string;
  email: string | null;
  noShowCount: number;
  bookingCount: number;
  totalValueCents: number;
  history: {
    id: string;
    whenText: string;
    serviceName: string;
    status: string;
  }[];
};

export async function getClientDetail(
  provider: ProviderContext,
  clientId: string,
): Promise<ClientDetail | null> {
  const supabase = await createServerSupabase();
  const { data: client } = await supabase
    .from("clients")
    .select("id, first_name, phone, email, no_show_count")
    .eq("provider_id", provider.id)
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return null;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, status, services (name, price_cents)")
    .eq("provider_id", provider.id)
    .eq("client_id", clientId)
    .order("starts_at", { ascending: false });

  const rows = bookings ?? [];
  const totalValueCents = rows
    .filter((b) => ["confirmed", "no_show"].includes(b.status))
    .reduce(
      (sum, b) => sum + (b.services as unknown as { price_cents: number }).price_cents,
      0,
    );

  return {
    id: client.id,
    firstName: client.first_name,
    phone: client.phone,
    email: client.email,
    noShowCount: client.no_show_count,
    bookingCount: rows.filter((b) => ["confirmed", "no_show"].includes(b.status)).length,
    totalValueCents,
    history: rows.map((b) => ({
      id: b.id,
      whenText: formatInTimeZone(
        new Date(b.starts_at),
        provider.timezone,
        "d MMM yyyy 'at' HH:mm",
      ),
      serviceName: (b.services as unknown as { name: string }).name,
      status: b.status,
    })),
  };
}
