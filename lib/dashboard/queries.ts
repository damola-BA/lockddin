import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { createServerSupabase } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { buildLocalWindows, localInstant, toMinutes } from "@/lib/scheduling/windows";
import { lastBookableDate } from "@/lib/scheduling/booking-window";
import { combineServices, getProviderServiceMap } from "@/lib/booking/service-set";

// Read side of the provider dashboard (F7) + client records (F10). Runs as
// the signed-in provider under RLS; confirmed/no-show bookings only — active
// holds are never shown (spec rule 4).

export type ProviderContext = {
  id: string;
  timezone: string;
  bookingWindow: "3_days" | "current_week" | "current_month" | "3_months";
  scheduleType: "regular" | "flexible";
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
    .select(
      "id, timezone, booking_window, schedule_type, business_name, provider_name, slug, location_text",
    )
    .eq("id", user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    timezone: data.timezone,
    bookingWindow: data.booking_window,
    scheduleType: data.schedule_type,
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

  const [{ data }, serviceMap] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, starts_at, ends_at, effective_end_at, status, source, service_ids, clients (id, first_name)",
      )
      .eq("provider_id", provider.id)
      .in("status", ["confirmed", "no_show"])
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd)
      .order("starts_at"),
    getProviderServiceMap(provider.id),
  ]);

  return (data ?? []).map((b) => {
    const client = b.clients as unknown as { id: string; first_name: string };
    const services = combineServices((b.service_ids as string[]) ?? [], serviceMap);
    return {
      id: b.id,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      timeText: `${formatInTimeZone(new Date(b.starts_at), provider.timezone, "HH:mm")}–${formatInTimeZone(new Date(b.ends_at), provider.timezone, "HH:mm")}`,
      status: b.status,
      source: b.source,
      serviceName: services.label,
      priceCents: services.priceCents,
      clientId: client.id,
      clientName: client.first_name,
      isPast: b.ends_at <= nowIso,
    };
  });
}

export type DayStats = { count: number; valueCents: number; gaps: number };

type DayShape = {
  hours: { start: number; end: number } | null;
  breaks: { start: number; end: number; label: string }[];
};

// Working hours + recurring/one-off breaks for one local date, after the
// override fork. Shared by the stat bar and the day timeline.
async function getDayShape(
  provider: ProviderContext,
  date: string,
): Promise<DayShape> {
  const admin = createAdminClient();
  const jsDate = new Date(`${date}T12:00:00Z`);
  const weekday = (jsDate.getUTCDay() + 6) % 7;

  const [{ data: template }, { data: override }] = await Promise.all([
    admin
      .from("week_template_days")
      .select("start_time, end_time, reserved_blocks (start_time, end_time, label)")
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

  if (override?.kind === "closed") return { hours: null, breaks: [] };
  if (override?.kind === "open" || override?.kind === "modified") {
    if (!override.start_time || !override.end_time) return { hours: null, breaks: [] };
    const breaks = ((override.extra_blocks ?? []) as {
      start: string;
      end: string;
      label?: string;
    }[]).map((b) => ({
      start: toMinutes(b.start),
      end: toMinutes(b.end),
      label: b.label ?? "Break",
    }));
    return {
      hours: { start: toMinutes(override.start_time), end: toMinutes(override.end_time) },
      breaks,
    };
  }
  if (template) {
    const breaks = (template.reserved_blocks ?? []).map((r) => ({
      start: toMinutes(r.start_time),
      end: toMinutes(r.end_time),
      label: r.label ?? "Break",
    }));
    return {
      hours: { start: toMinutes(template.start_time), end: toMinutes(template.end_time) },
      breaks,
    };
  }
  return { hours: null, breaks: [] };
}

function minutesToHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// Gaps = open stretches (≥15 min) left in the working day once breaks and
// confirmed bookings are removed.
export async function getDayStats(
  provider: ProviderContext,
  date: string,
  bookings: DayBooking[],
): Promise<DayStats> {
  const valueCents = bookings.reduce((sum, b) => sum + b.priceCents, 0);
  const count = bookings.length;
  const { hours, breaks } = await getDayShape(provider, date);
  if (!hours) return { count, valueCents, gaps: 0 };

  const blocks = [
    ...breaks.map((b) => ({ start: minutesToHHMM(b.start), end: minutesToHHMM(b.end) })),
    ...bookings.map((b) => ({
      start: formatInTimeZone(new Date(b.startsAt), provider.timezone, "HH:mm"),
      end: formatInTimeZone(new Date(b.endsAt), provider.timezone, "HH:mm"),
    })),
  ];
  const free = buildLocalWindows(hours, blocks).filter((w) => w.endMin - w.startMin >= 15);
  return { count, valueCents, gaps: free.length };
}

export type TimelineSegment =
  | {
      kind: "booking";
      startMin: number;
      endMin: number;
      timeText: string;
      id: string;
      clientName: string;
      serviceName: string;
      priceCents: number;
      status: string;
      isPast: boolean;
    }
  | { kind: "break"; startMin: number; endMin: number; timeText: string; label: string }
  | { kind: "free"; startMin: number; endMin: number; timeText: string; minutes: number };

export type DayTimeline =
  | { working: false }
  | { working: true; startMin: number; endMin: number; segments: TimelineSegment[] };

// The whole working day in order: bookings placed in time, breaks marked,
// and every open gap surfaced as bookable space.
export async function getDayTimeline(
  provider: ProviderContext,
  date: string,
  bookings: DayBooking[],
): Promise<DayTimeline> {
  const { hours, breaks } = await getDayShape(provider, date);
  if (!hours) return { working: false };

  const localMin = (iso: string) =>
    toMinutes(formatInTimeZone(new Date(iso), provider.timezone, "HH:mm"));

  const occupied: TimelineSegment[] = [
    ...breaks.map((b) => ({
      kind: "break" as const,
      startMin: b.start,
      endMin: b.end,
      timeText: `${minutesToHHMM(b.start)}–${minutesToHHMM(b.end)}`,
      label: b.label,
    })),
    ...bookings.map((b) => {
      const startMin = localMin(b.startsAt);
      const endMin = localMin(b.endsAt);
      return {
        kind: "booking" as const,
        startMin,
        endMin,
        timeText: b.timeText,
        id: b.id,
        clientName: b.clientName,
        serviceName: b.serviceName,
        priceCents: b.priceCents,
        status: b.status,
        isPast: b.isPast,
      };
    }),
  ].sort((a, b) => a.startMin - b.startMin);

  const segments: TimelineSegment[] = [];
  let cursor = hours.start;
  const pushFree = (from: number, to: number) => {
    if (to - from < 5) return; // ignore sub-5-min slivers
    segments.push({
      kind: "free",
      startMin: from,
      endMin: to,
      timeText: `${minutesToHHMM(from)}–${minutesToHHMM(to)}`,
      minutes: to - from,
    });
  };
  for (const seg of occupied) {
    if (seg.startMin > cursor) pushFree(cursor, seg.startMin);
    segments.push(seg);
    cursor = Math.max(cursor, seg.endMin);
  }
  pushFree(cursor, hours.end);

  return { working: true, startMin: hours.start, endMin: hours.end, segments };
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

  const [{ data }, serviceMap] = await Promise.all([
    supabase
      .from("bookings")
      .select("starts_at, service_ids")
      .eq("provider_id", provider.id)
      .in("status", ["confirmed", "no_show"])
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString()),
    getProviderServiceMap(provider.id),
  ]);

  const byDay = new Map<string, { count: number; valueCents: number }>();
  for (const d of days) byDay.set(d, { count: 0, valueCents: 0 });
  for (const b of data ?? []) {
    const local = formatInTimeZone(new Date(b.starts_at), provider.timezone, "yyyy-MM-dd");
    const cell = byDay.get(local);
    if (cell) {
      cell.count += 1;
      cell.valueCents += combineServices((b.service_ids as string[]) ?? [], serviceMap).priceCents;
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

// ── Day manager (F7 redesign) ────────────────────────────────────────

export type DayManager = {
  date: string;
  bookings: DayBooking[];
  services: { id: string; name: string }[];
  reservedBlocks: { start: string; end: string; label: string }[];
  template: { working: boolean; start: string; end: string } | null;
  override: {
    kind: string;
    start: string | null;
    end: string | null;
    dailyCap: number | null;
    serviceIds: string[] | null;
    extraBlocks: { start: string; end: string; label?: string }[];
  } | null;
};

export async function getDayManager(
  provider: ProviderContext,
  date: string,
): Promise<DayManager> {
  const admin = createAdminClient();
  const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;

  const [bookings, { data: services }, { data: template }, { data: override }] =
    await Promise.all([
      getDayBookings(provider, date),
      admin
        .from("services")
        .select("id, name")
        .eq("provider_id", provider.id)
        .eq("is_active", true)
        .order("sort_order"),
      admin
        .from("week_template_days")
        .select("start_time, end_time, reserved_blocks (start_time, end_time, label)")
        .eq("provider_id", provider.id)
        .eq("weekday", weekday)
        .maybeSingle(),
      admin
        .from("day_overrides")
        .select("kind, start_time, end_time, daily_cap, service_ids, extra_blocks")
        .eq("provider_id", provider.id)
        .eq("date", date)
        .maybeSingle(),
    ]);

  return {
    date,
    bookings,
    services: services ?? [],
    reservedBlocks: (template?.reserved_blocks ?? []).map((r) => ({
      start: r.start_time.slice(0, 5),
      end: r.end_time.slice(0, 5),
      label: r.label ?? "Break",
    })),
    template: template
      ? { working: true, start: template.start_time.slice(0, 5), end: template.end_time.slice(0, 5) }
      : null,
    override: override
      ? {
          kind: override.kind,
          start: override.start_time?.slice(0, 5) ?? null,
          end: override.end_time?.slice(0, 5) ?? null,
          dailyCap: override.daily_cap,
          serviceIds: override.service_ids,
          extraBlocks: (override.extra_blocks ?? []) as {
            start: string;
            end: string;
            label?: string;
          }[],
        }
      : null,
  };
}

// ── Booking detail ───────────────────────────────────────────────────

export type BookingDetail = {
  id: string;
  startsAt: string;
  whenText: string;
  status: string;
  source: string;
  serviceIds: string[];
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
      "id, starts_at, ends_at, status, source, cancellation_window_hours, service_ids, clients (id, first_name, phone)",
    )
    .eq("provider_id", provider.id)
    .eq("id", bookingId)
    .maybeSingle();
  if (!data) return null;

  const client = data.clients as unknown as {
    id: string;
    first_name: string;
    phone: string;
  };
  const serviceIds = (data.service_ids as string[]) ?? [];
  const services = combineServices(serviceIds, await getProviderServiceMap(provider.id));

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
    serviceIds,
    serviceName: services.label,
    priceCents: services.priceCents,
    durationMinutes: services.durationMinutes,
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

  const [{ data: bookings }, serviceMap] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, starts_at, status, service_ids")
      .eq("provider_id", provider.id)
      .eq("client_id", clientId)
      .order("starts_at", { ascending: false }),
    getProviderServiceMap(provider.id),
  ]);

  const rows = bookings ?? [];
  const combined = (ids: unknown) =>
    combineServices((ids as string[]) ?? [], serviceMap);
  const totalValueCents = rows
    .filter((b) => ["confirmed", "no_show"].includes(b.status))
    .reduce((sum, b) => sum + combined(b.service_ids).priceCents, 0);

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
      serviceName: combined(b.service_ids).label,
      status: b.status,
    })),
  };
}
