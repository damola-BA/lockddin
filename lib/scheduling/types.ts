// Engine input types (F4). The engine is pure: all data arrives through
// these shapes; the only I/O is the injected bookings/holds fetch.

export type BookingWindow =
  | "3_days"
  | "current_week"
  | "current_month"
  | "3_months";

export type ScheduleType = "regular" | "flexible";

export interface EngineProvider {
  timezone: string; // Europe/Brussels for beta
  bookingWindow: BookingWindow;
  minLeadTimeMinutes: number;
  globalBufferMinutes: number;
  scheduleType: ScheduleType;
}

export interface EngineService {
  id: string;
  durationMinutes: number;
  bufferMinutes: number | null; // null = use global buffer
}

// "HH:MM" local time in the provider's timezone.
export type LocalTime = string;

export interface TimeBlock {
  start: LocalTime;
  end: LocalTime;
}

export interface TemplateDay {
  weekday: number; // 0=Mon..6=Sun (matches week_template_days)
  start: LocalTime;
  end: LocalTime;
  dailyCap: number | null;
  serviceIds: string[] | null; // null = all services allowed
  reservedBlocks: TimeBlock[];
}

export interface DayOverride {
  kind: "closed" | "open" | "modified";
  start: LocalTime | null;
  end: LocalTime | null;
  extraBlocks: TimeBlock[];
  dailyCap: number | null;
}

// UTC instants, as stored.
export interface OccupiedRange {
  startsAt: Date;
  effectiveEndAt: Date;
}

export interface OccupiedData {
  // status='confirmed' bookings overlapping the local date.
  confirmedBookings: OccupiedRange[];
  // status='active' AND expires_at > now holds.
  activeHolds: OccupiedRange[];
}

export interface Slot {
  startsAt: Date; // UTC
  endsAt: Date; // UTC — what the client sees (duration only)
  effectiveEndAt: Date; // UTC — endsAt + buffer (occupies the calendar)
}

export interface AvailabilityInput {
  provider: EngineProvider;
  service: EngineService;
  /** Calendar date in the provider's timezone, "YYYY-MM-DD". */
  date: string;
  now: Date;
  /** Regular mode: the template day matching this date's weekday, if any. */
  templateDay: TemplateDay | null;
  /** Override for this exact date, if any. */
  override: DayOverride | null;
  occupied: OccupiedData;
}
