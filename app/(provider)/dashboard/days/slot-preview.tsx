import { getDayAvailability } from "@/lib/scheduling/availability";
import { formatInTimeZone } from "date-fns-tz";

// Server component: lets the provider sanity-check what clients will see
// (M2 acceptance: configure a realistic week, see correct slots).
export async function SlotPreview({
  providerId,
  services,
  date,
  serviceId,
}: {
  providerId: string;
  services: { id: string; name: string }[];
  date: string;
  serviceId: string;
}) {
  const slots = await getDayAvailability({ providerId, serviceIds: [serviceId], date });
  const service = services.find((s) => s.id === serviceId);

  return (
    <div className="mt-3 rounded-lg border border-line bg-surface-2 p-4">
      <p className="mb-2 text-sm text-ink-3">
        {service?.name} — {date}
      </p>
      {slots.length === 0 ? (
        <p className="text-sm text-ink-3">No slots on this day.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <span
              key={slot.startsAt.toISOString()}
              className="rounded border border-accent/40 px-2.5 py-1 text-sm text-accent"
            >
              {formatInTimeZone(slot.startsAt, "Europe/Brussels", "HH:mm")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
